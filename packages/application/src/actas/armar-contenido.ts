import type {
  ContenidoDeActa,
  Cuerpo,
  Decision,
  Institucion,
  Sesion,
  SolicitudDePalabra,
  TipoDeMocion,
} from "@kuorum/domain";

/** Llegaron a hablar o la mesa las rechazó; las retiradas y las que siguen en fila no cuentan. */
const MOCION_ATENDIDA = new Set(["CON_LA_PALABRA", "TERMINADA", "RECHAZADA"]);
const INTERVENCION_HECHA = new Set(["CON_LA_PALABRA", "TERMINADA"]);

/** Pura. Sin nombres de quienes pidieron la palabra: solo cuentas. */
export function armarContenidoDeActa(
  sesion: Sesion,
  cuerpo: Cuerpo,
  institucion: Institucion,
  decisiones: readonly Decision[],
  solicitudes: readonly SolicitudDePalabra[],
  asistentes: number | null,
  desarrollo: string,
): ContenidoDeActa {
  const mociones: Record<TipoDeMocion, number> = {
    ORDEN: 0,
    PROCEDIMIENTO: 0,
    ACLARACION: 0,
    SUFICIENTE_ILUSTRACION: 0,
  };
  let intervenciones = 0;
  for (const s of solicitudes) {
    if (s.tipo === "INTERVENCION" && INTERVENCION_HECHA.has(s.estado)) intervenciones += 1;
    if (s.tipo === "MOCION" && s.mocion !== null && MOCION_ATENDIDA.has(s.estado)) {
      mociones[s.mocion] += 1;
    }
  }
  return {
    institucion: institucion.nombre,
    cuerpo: cuerpo.nombre,
    titulo: sesion.titulo,
    inicio: sesion.inicio.toISOString(),
    fin: sesion.fin.toISOString(),
    zonaHoraria: institucion.zonaHoraria,
    modalidad: sesion.modalidad,
    lugar: sesion.lugar,
    ordenDelDia: [...sesion.ordenDelDia],
    asistentes,
    intervenciones,
    mociones,
    desarrollo,
    decisiones: [...decisiones]
      .sort((a, b) => a.cerradaEn.getTime() - b.cerradaEn.getTime())
      .map((d) => ({
        pregunta: d.pregunta,
        enunciado: d.enunciado,
        aprobada: d.aprobada,
        indicativa: d.indicativa,
        resultado: d.resultado,
      })),
  };
}
