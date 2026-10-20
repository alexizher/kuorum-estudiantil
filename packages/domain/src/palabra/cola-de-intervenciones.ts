import { ErrorDeDominio } from "../errores.js";
import type { GeneradorDeIds } from "../generador-de-ids.js";
import type { Reloj } from "../reloj.js";
import { SolicitudDePalabra, type DatosDeSolicitud } from "./solicitud-de-palabra.js";
import { PRIORIDAD_DE_MOCION } from "./tipo-de-mocion.js";

const SEGUNDOS_POR_MINUTO_EXTRA = 60;

export class ColaDeIntervenciones {
  private readonly solicitudes: SolicitudDePalabra[];
  private readonly modificadas = new Set<SolicitudDePalabra>();

  constructor(
    solicitudes: SolicitudDePalabra[],
    private readonly segundosPorIntervencion: number,
    private readonly sesionId: string,
  ) {
    this.solicitudes = [...solicitudes];
  }

  enEspera(): SolicitudDePalabra[] {
    return this.solicitudes
      .map((solicitud, posicion) => ({ solicitud, posicion }))
      .filter(({ solicitud }) => solicitud.esperando)
      .sort((a, b) => comparar(a.solicitud, b.solicitud) || a.posicion - b.posicion)
      .map(({ solicitud }) => solicitud);
  }

  conLaPalabra(): SolicitudDePalabra | null {
    return this.solicitudes.find((s) => s.estado === "CON_LA_PALABRA") ?? null;
  }

  cambiadas(): SolicitudDePalabra[] {
    return [...this.modificadas];
  }

  pedir(datos: DatosDeSolicitud, reloj: Reloj, generadorDeIds: GeneradorDeIds): SolicitudDePalabra {
    const repetida = this.solicitudes.some(
      (s) => s.esperando && s.participanteId === datos.participanteId && s.tipo === datos.tipo,
    );
    if (repetida) throw new ErrorDeDominio("YA_EN_LA_FILA");
    const nueva = SolicitudDePalabra.nueva(this.sesionId, datos, reloj, generadorDeIds);
    this.solicitudes.push(nueva);
    this.modificadas.add(nueva);
    return nueva;
  }

  retirar(id: string, participanteId: string): void {
    const solicitud = this.buscar(id);
    if (solicitud.participanteId !== participanteId) throw new ErrorDeDominio("NO_ES_TUYA");
    solicitud.retirar();
    this.modificadas.add(solicitud);
  }

  darLaPalabra(id: string | null, reloj: Reloj): void {
    const elegida = id === null ? this.primeraDeLaFila() : this.buscar(id);
    if (!elegida.esperando) throw new ErrorDeDominio("SOLICITUD_NO_DISPONIBLE");
    const actual = this.conLaPalabra();
    if (actual) {
      actual.terminar(reloj);
      this.modificadas.add(actual);
    }
    elegida.darLaPalabra(reloj);
    this.modificadas.add(elegida);
  }

  terminar(reloj: Reloj): void {
    const actual = this.exigirConLaPalabra();
    actual.terminar(reloj);
    this.modificadas.add(actual);
  }

  rechazarMocion(id: string): void {
    const solicitud = this.buscar(id);
    if (solicitud.tipo !== "MOCION") throw new ErrorDeDominio("SOLICITUD_NO_DISPONIBLE");
    solicitud.rechazar();
    this.modificadas.add(solicitud);
  }

  sumarMinuto(): void {
    const actual = this.exigirConLaPalabra();
    actual.sumarSegundos(SEGUNDOS_POR_MINUTO_EXTRA);
    this.modificadas.add(actual);
  }

  segundosRestantes(reloj: Reloj): number | null {
    const diferencia = this.diferenciaDeTiempo(reloj);
    return diferencia === null ? null : Math.max(0, diferencia);
  }

  segundosExcedidos(reloj: Reloj): number | null {
    const diferencia = this.diferenciaDeTiempo(reloj);
    return diferencia === null ? null : Math.max(0, -diferencia);
  }

  private diferenciaDeTiempo(reloj: Reloj): number | null {
    const actual = this.conLaPalabra();
    if (!actual?.inicioEn) return null;
    const transcurridos = Math.floor((reloj.ahora().getTime() - actual.inicioEn.getTime()) / 1000);
    return this.segundosPorIntervencion + actual.segundosExtra - transcurridos;
  }

  private primeraDeLaFila(): SolicitudDePalabra {
    const primera = this.enEspera()[0];
    if (!primera) throw new ErrorDeDominio("FILA_VACIA");
    return primera;
  }

  private exigirConLaPalabra(): SolicitudDePalabra {
    const actual = this.conLaPalabra();
    if (!actual) throw new ErrorDeDominio("NADIE_CON_LA_PALABRA");
    return actual;
  }

  private buscar(id: string): SolicitudDePalabra {
    const solicitud = this.solicitudes.find((s) => s.id === id);
    if (!solicitud) throw new ErrorDeDominio("SOLICITUD_NO_DISPONIBLE");
    return solicitud;
  }
}

function comparar(a: SolicitudDePalabra, b: SolicitudDePalabra): number {
  if (a.mocion && !b.mocion) return -1;
  if (!a.mocion && b.mocion) return 1;
  if (a.mocion && b.mocion) {
    const porPrioridad = PRIORIDAD_DE_MOCION[a.mocion] - PRIORIDAD_DE_MOCION[b.mocion];
    if (porPrioridad !== 0) return porPrioridad;
  }
  return a.pedidaEn.getTime() - b.pedidaEn.getTime();
}
