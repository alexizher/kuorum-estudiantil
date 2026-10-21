import { ErrorDeDominio } from "../errores.js";
import type { CodigoDeSala } from "./codigo-de-sala.js";
import type { EstadoDeSesion } from "./estado-de-sesion.js";
import type { GeneradorDeCodigos } from "./generador-de-codigos.js";
import type { ModoDeParticipacion } from "./modo-de-participacion.js";

const TITULO_MIN = 3;
const TITULO_MAX = 140;
const SEGUNDOS_MIN = 30;
const SEGUNDOS_MAX = 900;
const SEGUNDOS_POR_DEFECTO = 180;

export interface DatosDeNuevaSesion {
  id: string;
  titulo: string;
  modo: ModoDeParticipacion;
  segundosPorIntervencion?: number;
  creadaEn: Date;
}

export interface PropiedadesDeSesion {
  id: string;
  titulo: string;
  codigoDeSala: CodigoDeSala;
  modo: ModoDeParticipacion;
  estado: EstadoDeSesion;
  segundosPorIntervencion: number;
  version: number;
  creadaEn: Date;
}

export class Sesion {
  private _estado: EstadoDeSesion;
  private _version: number;

  private constructor(
    readonly id: string,
    readonly titulo: string,
    readonly codigoDeSala: CodigoDeSala,
    readonly modo: ModoDeParticipacion,
    estado: EstadoDeSesion,
    readonly segundosPorIntervencion: number,
    version: number,
    readonly creadaEn: Date,
  ) {
    this._estado = estado;
    this._version = version;
  }

  static nueva(datos: DatosDeNuevaSesion, generador: GeneradorDeCodigos): Sesion {
    return Sesion.reconstruir({
      id: datos.id,
      titulo: datos.titulo,
      codigoDeSala: generador.codigoDeSala(),
      modo: datos.modo,
      estado: "PROGRAMADA",
      segundosPorIntervencion: datos.segundosPorIntervencion ?? SEGUNDOS_POR_DEFECTO,
      version: 0,
      creadaEn: datos.creadaEn,
    });
  }

  static reconstruir(props: PropiedadesDeSesion): Sesion {
    const titulo = props.titulo.trim();
    if (titulo.length < TITULO_MIN || titulo.length > TITULO_MAX) {
      throw new ErrorDeDominio("TITULO_INVALIDO");
    }
    const { segundosPorIntervencion } = props;
    if (
      !Number.isInteger(segundosPorIntervencion) ||
      segundosPorIntervencion < SEGUNDOS_MIN ||
      segundosPorIntervencion > SEGUNDOS_MAX
    ) {
      throw new ErrorDeDominio("SEGUNDOS_INVALIDOS");
    }
    if (!Number.isInteger(props.version) || props.version < 0) {
      throw new ErrorDeDominio("VERSION_INVALIDA");
    }
    return new Sesion(
      props.id,
      titulo,
      props.codigoDeSala,
      props.modo,
      props.estado,
      segundosPorIntervencion,
      props.version,
      props.creadaEn,
    );
  }

  get estado(): EstadoDeSesion {
    return this._estado;
  }

  get version(): number {
    return this._version;
  }

  iniciar(): void {
    if (this._estado !== "PROGRAMADA" && this._estado !== "ABIERTA") {
      throw new ErrorDeDominio("TRANSICION_INVALIDA");
    }
    this._estado = "EN_CURSO";
  }

  terminar(): void {
    if (this._estado !== "EN_CURSO") {
      throw new ErrorDeDominio("TRANSICION_INVALIDA");
    }
    this._estado = "CERRADA";
  }

  exigirEnCurso(): void {
    if (this._estado !== "EN_CURSO") {
      throw new ErrorDeDominio("SESION_NO_EN_CURSO");
    }
  }

  registrarCambio(): void {
    this._version += 1;
  }
}
