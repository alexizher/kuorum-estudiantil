import {
  CodigoDeSala,
  ColaDeIntervenciones,
  ErrorDeDominio,
  Resultado,
  type EstadoDePregunta,
  type EstadoDeSesion,
  type ModoDeParticipacion,
  type Pregunta,
  type RegistroDeVotos,
  type Reloj,
  type SolicitudDePalabra,
  type TipoDeMocion,
  type TipoDeSolicitud,
} from "@kuorum/domain";
import type { RepositorioDeParticipantes } from "../puertos/repositorio-de-participantes.js";
import type { RepositorioDePreguntas } from "../puertos/repositorio-de-preguntas.js";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { RepositorioDeSolicitudes } from "../puertos/repositorio-de-solicitudes.js";

/** Misma forma que `EstadoDeSala` de @kuorum/contracts (application no depende de contracts). */
export interface EstadoDeSala {
  sala: {
    codigo: string;
    titulo: string;
    estado: EstadoDeSesion;
    modo: ModoDeParticipacion;
    indicativa: boolean;
  };
  version: number;
  asistencia: number | null;
  pregunta: null | {
    id: string;
    texto: string;
    estado: EstadoDePregunta;
    secreta: true;
    opciones: { id: string; texto: string }[];
    votosEmitidos: number;
    resultado: null | {
      totalVotos: number;
      porOpcion: { opcionId: string; texto: string; votos: number; porcentaje: number }[];
      ganadora: string | null;
      aprobada: boolean | null;
    };
  };
  palabra: {
    conLaPalabra: null | (SolicitudEnFila & { inicioEn: string; segundosTotales: number });
    fila: SolicitudEnFila[];
  };
  horaDelServidor: string;
}

interface SolicitudEnFila {
  id: string;
  nombre: string;
  tipo: TipoDeSolicitud;
  mocion: TipoDeMocion | null;
}

/** ETag del estado público: los votos mueven el contador sin tocar `Sesion.version`. */
export function etiquetaDeEstado(estado: EstadoDeSala): string {
  return `${estado.version}-${estado.pregunta?.votosEmitidos ?? 0}`;
}

export class ConsultarEstadoDeSala {
  constructor(
    private readonly sesiones: RepositorioDeSesiones,
    private readonly participantes: RepositorioDeParticipantes,
    private readonly preguntas: RepositorioDePreguntas,
    private readonly votos: RegistroDeVotos,
    private readonly solicitudes: RepositorioDeSolicitudes,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(codigoDeSala: string): Promise<EstadoDeSala> {
    const sesion = await this.buscarSesion(codigoDeSala);
    const [asistencia, pregunta, solicitudes] = await Promise.all([
      sesion.modo === "CON_CODIGOS" ? this.participantes.contarActivos(sesion.id) : null,
      this.preguntaVisible(sesion.id),
      this.solicitudes.deSesion(sesion.id),
    ]);
    const cola = new ColaDeIntervenciones(solicitudes, sesion.segundosPorIntervencion, sesion.id);
    return {
      sala: {
        codigo: sesion.codigoDeSala.valor,
        titulo: sesion.titulo,
        estado: sesion.estado,
        modo: sesion.modo,
        indicativa: sesion.modo === "SALA_ABIERTA",
      },
      version: sesion.version,
      asistencia,
      pregunta: pregunta ? await this.proyectarPregunta(pregunta) : null,
      palabra: {
        conLaPalabra: this.proyectarConLaPalabra(
          cola.conLaPalabra(),
          sesion.segundosPorIntervencion,
        ),
        fila: cola.enEspera().map(enFila),
      },
      horaDelServidor: this.reloj.ahora().toISOString(),
    };
  }

  private async buscarSesion(codigoDeSala: string) {
    let codigo: CodigoDeSala;
    try {
      codigo = CodigoDeSala.crear(codigoDeSala);
    } catch {
      throw new ErrorDeDominio("SALA_NO_DISPONIBLE");
    }
    const sesion = await this.sesiones.porCodigoDeSala(codigo);
    if (sesion === null) throw new ErrorDeDominio("SALA_NO_DISPONIBLE");
    return sesion;
  }

  /** La abierta; si no hay, la última cerrada con resultado proyectado. */
  private async preguntaVisible(sesionId: string): Promise<Pregunta | null> {
    const abierta = await this.preguntas.abiertaDeSesion(sesionId);
    if (abierta) return abierta;
    const cerradas = (await this.preguntas.deSesion(sesionId))
      .filter((p) => p.estado === "CERRADA" && p.resultadoVisible)
      .sort((a, b) => (b.cerradaEn?.getTime() ?? 0) - (a.cerradaEn?.getTime() ?? 0));
    return cerradas[0] ?? null;
  }

  private async proyectarPregunta(
    pregunta: Pregunta,
  ): Promise<NonNullable<EstadoDeSala["pregunta"]>> {
    const votosEmitidos = await this.votos.votosEmitidos(pregunta.id);
    const resultado = pregunta.resultadoVisible
      ? Resultado.calcular(pregunta, await this.votos.conteos(pregunta.id))
      : null;
    return {
      id: pregunta.id,
      texto: pregunta.texto,
      estado: pregunta.estado,
      secreta: true,
      opciones: pregunta.opciones.map((o) => ({ id: o.id, texto: o.texto })),
      votosEmitidos,
      resultado: resultado && {
        totalVotos: resultado.totalVotos,
        porOpcion: resultado.porOpcion.map((o) => ({ ...o })),
        ganadora: resultado.ganadora,
        aprobada: resultado.aprobada,
      },
    };
  }

  private proyectarConLaPalabra(
    solicitud: SolicitudDePalabra | null,
    segundosPorIntervencion: number,
  ): EstadoDeSala["palabra"]["conLaPalabra"] {
    if (solicitud === null || solicitud.inicioEn === null) return null;
    return {
      ...enFila(solicitud),
      inicioEn: solicitud.inicioEn.toISOString(),
      segundosTotales: segundosPorIntervencion + solicitud.segundosExtra,
    };
  }
}

function enFila(solicitud: SolicitudDePalabra): SolicitudEnFila {
  return {
    id: solicitud.id,
    nombre: solicitud.nombreVisible,
    tipo: solicitud.tipo,
    mocion: solicitud.mocion,
  };
}
