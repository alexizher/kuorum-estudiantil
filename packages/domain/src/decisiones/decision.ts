import { ErrorDeDominio } from "../errores.js";
import type { Pregunta } from "../votacion/pregunta.js";
import type { Resultado } from "../votacion/resultado.js";
import type { Sesion } from "../sesion/sesion.js";

const ENUNCIADO_MAX = 1_000;

export interface FotoDeResultado {
  totalVotos: number;
  asistentes: number | null;
  porOpcion: { texto: string; votos: number; porcentaje: number }[];
}

export interface PropiedadesDeDecision {
  id: string;
  preguntaId: string;
  sesionId: string;
  cuerpoId: string;
  pregunta: string;
  regla: "MAYORIA_SIMPLE";
  resultado: FotoDeResultado;
  aprobada: boolean | null;
  indicativa: boolean;
  enunciado: string | null;
  consultaId: string | null;
  cerradaEn: Date;
}

export interface DatosDeDecision {
  id: string;
  pregunta: Pregunta;
  sesion: Sesion;
  resultado: Resultado;
  asistentes: number | null;
  cerradaEn: Date;
}

function enunciadoValido(texto: string | null): string | null {
  const limpio = texto?.trim() ?? "";
  if (limpio.length > ENUNCIADO_MAX) throw new ErrorDeDominio("ENUNCIADO_INVALIDO");
  return limpio === "" ? null : limpio;
}

/** Foto del resultado de una votación cerrada. No se recalcula después. */
export class Decision {
  readonly id: string;
  readonly preguntaId: string;
  readonly sesionId: string;
  readonly cuerpoId: string;
  readonly pregunta: string;
  readonly regla: "MAYORIA_SIMPLE";
  readonly resultado: FotoDeResultado;
  readonly aprobada: boolean | null;
  readonly indicativa: boolean;
  readonly consultaId: string | null;
  readonly cerradaEn: Date;
  private _enunciado: string | null;

  private constructor(props: PropiedadesDeDecision) {
    this.id = props.id;
    this.preguntaId = props.preguntaId;
    this.sesionId = props.sesionId;
    this.cuerpoId = props.cuerpoId;
    this.pregunta = props.pregunta;
    this.regla = props.regla;
    this.resultado = props.resultado;
    this.aprobada = props.aprobada;
    this.indicativa = props.indicativa;
    this.consultaId = props.consultaId;
    this.cerradaEn = props.cerradaEn;
    this._enunciado = props.enunciado;
  }

  static desdeResultado(datos: DatosDeDecision): Decision {
    const { pregunta, sesion, resultado } = datos;
    return new Decision({
      id: datos.id,
      preguntaId: pregunta.id,
      sesionId: sesion.id,
      cuerpoId: sesion.cuerpoId,
      pregunta: pregunta.texto,
      regla: "MAYORIA_SIMPLE",
      resultado: {
        totalVotos: resultado.totalVotos,
        asistentes: datos.asistentes,
        porOpcion: resultado.porOpcion.map((o) => ({
          texto: o.texto,
          votos: o.votos,
          porcentaje: o.porcentaje,
        })),
      },
      aprobada: resultado.aprobada,
      indicativa: sesion.modo === "SALA_ABIERTA",
      enunciado: null,
      consultaId: null,
      cerradaEn: datos.cerradaEn,
    });
  }

  static reconstruir(props: PropiedadesDeDecision): Decision {
    return new Decision({ ...props, enunciado: enunciadoValido(props.enunciado) });
  }

  get enunciado(): string | null {
    return this._enunciado;
  }

  cambiarEnunciado(texto: string | null): void {
    this._enunciado = enunciadoValido(texto);
  }
}
