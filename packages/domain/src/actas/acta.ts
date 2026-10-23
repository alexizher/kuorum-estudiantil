import { ErrorDeDominio } from "../errores.js";
import type { FotoDeResultado } from "../decisiones/decision.js";
import type { TipoDeMocion } from "../palabra/tipo-de-mocion.js";
import type { Modalidad } from "../sesion/modalidad.js";
import type { CodigoDeVerificacion } from "./codigo-de-verificacion.js";

const DESARROLLO_MAX = 20_000;

export interface DecisionDeActa {
  pregunta: string;
  enunciado: string | null;
  aprobada: boolean | null;
  indicativa: boolean;
  resultado: FotoDeResultado;
}

/** Foto de lo que dice el acta al finalizarla; no se recalcula. */
export interface ContenidoDeActa {
  institucion: string;
  cuerpo: string;
  titulo: string;
  inicio: string;
  fin: string;
  zonaHoraria: string;
  modalidad: Modalidad;
  lugar: string | null;
  ordenDelDia: readonly string[];
  asistentes: number | null;
  intervenciones: number;
  mociones: Record<TipoDeMocion, number>;
  desarrollo: string;
  decisiones: readonly DecisionDeActa[];
}

export type EstadoDeActa = "BORRADOR" | "FINAL";

export interface PropiedadesDeActa {
  sesionId: string;
  desarrollo: string;
  estado: EstadoDeActa;
  codigo: CodigoDeVerificacion | null;
  finalizadaEn: Date | null;
  contenido: ContenidoDeActa | null;
}

function desarrolloValido(desarrollo: string): string {
  if (desarrollo.length > DESARROLLO_MAX) throw new ErrorDeDominio("DESARROLLO_INVALIDO");
  return desarrollo;
}

export class Acta {
  private _desarrollo: string;
  private _estado: EstadoDeActa;
  private _codigo: CodigoDeVerificacion | null;
  private _finalizadaEn: Date | null;
  private _contenido: ContenidoDeActa | null;

  private constructor(
    readonly sesionId: string,
    props: Omit<PropiedadesDeActa, "sesionId">,
  ) {
    this._desarrollo = props.desarrollo;
    this._estado = props.estado;
    this._codigo = props.codigo;
    this._finalizadaEn = props.finalizadaEn;
    this._contenido = props.contenido;
  }

  static borrador(sesionId: string): Acta {
    return new Acta(sesionId, {
      desarrollo: "",
      estado: "BORRADOR",
      codigo: null,
      finalizadaEn: null,
      contenido: null,
    });
  }

  static reconstruir(props: PropiedadesDeActa): Acta {
    const { sesionId, ...resto } = props;
    return new Acta(sesionId, { ...resto, desarrollo: desarrolloValido(resto.desarrollo) });
  }

  get desarrollo(): string {
    return this._desarrollo;
  }

  get estado(): EstadoDeActa {
    return this._estado;
  }

  get codigo(): CodigoDeVerificacion | null {
    return this._codigo;
  }

  get finalizadaEn(): Date | null {
    return this._finalizadaEn;
  }

  get contenido(): ContenidoDeActa | null {
    return this._contenido;
  }

  editar(desarrollo: string): void {
    this.exigirBorrador();
    this._desarrollo = desarrolloValido(desarrollo);
  }

  finalizar(contenido: ContenidoDeActa, codigo: CodigoDeVerificacion, ahora: Date): void {
    this.exigirBorrador();
    this._estado = "FINAL";
    this._codigo = codigo;
    this._finalizadaEn = ahora;
    this._contenido = contenido;
  }

  private exigirBorrador(): void {
    if (this._estado === "FINAL") throw new ErrorDeDominio("ACTA_FINALIZADA");
  }
}
