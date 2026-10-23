import { ErrorDeDominio } from "../errores.js";
import type { CodigoDeSala } from "./codigo-de-sala.js";
import type { EstadoDeSesion } from "./estado-de-sesion.js";
import type { GeneradorDeCodigos } from "./generador-de-codigos.js";
import type { Modalidad } from "./modalidad.js";
import type { ModoDeParticipacion } from "./modo-de-participacion.js";

const TITULO_MIN = 3;
const TITULO_MAX = 140;
const SEGUNDOS_MIN = 30;
const SEGUNDOS_MAX = 900;
const SEGUNDOS_POR_DEFECTO = 180;
const LUGAR_MAX = 200;
const ORDEN_PUNTOS_MAX = 30;
const ORDEN_PUNTO_MAX = 200;
const DURACION_MAX_MS = 24 * 3_600_000;

/** Cuándo, dónde y de qué cuerpo es la sesión. */
export interface Programacion {
  cuerpoId: string;
  inicio: Date;
  fin: Date;
  modalidad: Modalidad;
  /** Sala o enlace; opcional. */
  lugar?: string | null;
}

export interface CambiosDeProgramacion {
  titulo?: string;
  inicio?: Date;
  fin?: Date;
  modalidad?: Modalidad;
  lugar?: string | null;
  ordenDelDia?: readonly string[];
}

function ordenValido(puntos: readonly string[] | undefined): readonly string[] {
  const limpios = (puntos ?? []).map((p) => p.trim()).filter((p) => p !== "");
  if (limpios.length > ORDEN_PUNTOS_MAX || limpios.some((p) => p.length > ORDEN_PUNTO_MAX)) {
    throw new ErrorDeDominio("ORDEN_DEL_DIA_INVALIDO");
  }
  return limpios;
}

function tituloValido(titulo: string): string {
  const limpio = titulo.trim();
  if (limpio.length < TITULO_MIN || limpio.length > TITULO_MAX) {
    throw new ErrorDeDominio("TITULO_INVALIDO");
  }
  return limpio;
}

function lugarValido(lugar: string | null | undefined): string | null {
  const limpio = lugar?.trim() ?? "";
  if (limpio.length > LUGAR_MAX) throw new ErrorDeDominio("LUGAR_INVALIDO");
  return limpio === "" ? null : limpio;
}

function exigirHorario(inicio: Date, fin: Date): void {
  const duracion = fin.getTime() - inicio.getTime();
  if (Number.isNaN(duracion) || duracion <= 0 || duracion > DURACION_MAX_MS) {
    throw new ErrorDeDominio("HORARIO_INVALIDO");
  }
}

export interface DatosDeNuevaSesion extends Programacion {
  id: string;
  titulo: string;
  modo: ModoDeParticipacion;
  segundosPorIntervencion?: number;
  creadaEn: Date;
  /** Quién la creó; null si no se sabe. */
  creadaPorId?: string | null;
  creadaPorDemo?: boolean;
  ordenDelDia?: readonly string[];
}

export interface PropiedadesDeSesion extends Programacion {
  id: string;
  titulo: string;
  codigoDeSala: CodigoDeSala;
  modo: ModoDeParticipacion;
  estado: EstadoDeSesion;
  segundosPorIntervencion: number;
  version: number;
  creadaEn: Date;
  creadaPorId?: string | null;
  /** La creó una cuenta de prueba: no sale en el calendario ni en los cruces de otros. */
  creadaPorDemo?: boolean;
  ordenDelDia?: readonly string[];
}

export class Sesion {
  private _titulo: string;
  private _estado: EstadoDeSesion;
  private _version: number;
  private _inicio: Date;
  private _fin: Date;
  private _modalidad: Modalidad;
  private _lugar: string | null;
  private _ordenDelDia: readonly string[];

  private constructor(
    readonly id: string,
    titulo: string,
    readonly codigoDeSala: CodigoDeSala,
    readonly modo: ModoDeParticipacion,
    estado: EstadoDeSesion,
    readonly segundosPorIntervencion: number,
    version: number,
    readonly creadaEn: Date,
    readonly creadaPorId: string | null,
    readonly creadaPorDemo: boolean,
    readonly cuerpoId: string,
    programacion: {
      inicio: Date;
      fin: Date;
      modalidad: Modalidad;
      lugar: string | null;
      ordenDelDia: readonly string[];
    },
  ) {
    this._titulo = titulo;
    this._estado = estado;
    this._version = version;
    this._inicio = programacion.inicio;
    this._fin = programacion.fin;
    this._modalidad = programacion.modalidad;
    this._lugar = programacion.lugar;
    this._ordenDelDia = programacion.ordenDelDia;
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
      creadaPorId: datos.creadaPorId ?? null,
      creadaPorDemo: datos.creadaPorDemo ?? false,
      cuerpoId: datos.cuerpoId,
      inicio: datos.inicio,
      fin: datos.fin,
      modalidad: datos.modalidad,
      lugar: datos.lugar ?? null,
      ordenDelDia: datos.ordenDelDia ?? [],
    });
  }

  static reconstruir(props: PropiedadesDeSesion): Sesion {
    const titulo = tituloValido(props.titulo);
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
    exigirHorario(props.inicio, props.fin);
    return new Sesion(
      props.id,
      titulo,
      props.codigoDeSala,
      props.modo,
      props.estado,
      segundosPorIntervencion,
      props.version,
      props.creadaEn,
      props.creadaPorId ?? null,
      props.creadaPorDemo ?? false,
      props.cuerpoId,
      {
        inicio: props.inicio,
        fin: props.fin,
        modalidad: props.modalidad,
        lugar: lugarValido(props.lugar),
        ordenDelDia: ordenValido(props.ordenDelDia),
      },
    );
  }

  get titulo(): string {
    return this._titulo;
  }

  get inicio(): Date {
    return this._inicio;
  }

  get fin(): Date {
    return this._fin;
  }

  get modalidad(): Modalidad {
    return this._modalidad;
  }

  get lugar(): string | null {
    return this._lugar;
  }

  get ordenDelDia(): readonly string[] {
    return this._ordenDelDia;
  }

  get estado(): EstadoDeSesion {
    return this._estado;
  }

  get version(): number {
    return this._version;
  }

  /** Una sesión terminada (cerrada, con acta final o cancelada) ya no cuenta como activa. */
  get activa(): boolean {
    return (
      this._estado !== "CERRADA" && this._estado !== "ACTA_FINAL" && this._estado !== "CANCELADA"
    );
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

  finalizarActa(): void {
    if (this._estado !== "CERRADA") throw new ErrorDeDominio("TRANSICION_INVALIDA");
    this._estado = "ACTA_FINAL";
  }

  /** Solo antes de abrirla. Valida todo antes de cambiar nada. */
  reprogramar(cambios: CambiosDeProgramacion): void {
    if (this._estado !== "PROGRAMADA") throw new ErrorDeDominio("TRANSICION_INVALIDA");
    const titulo = cambios.titulo === undefined ? this._titulo : tituloValido(cambios.titulo);
    const inicio = cambios.inicio ?? this._inicio;
    const fin = cambios.fin ?? this._fin;
    exigirHorario(inicio, fin);
    const lugar = cambios.lugar === undefined ? this._lugar : lugarValido(cambios.lugar);
    const ordenDelDia =
      cambios.ordenDelDia === undefined ? this._ordenDelDia : ordenValido(cambios.ordenDelDia);
    this._titulo = titulo;
    this._ordenDelDia = ordenDelDia;
    this._inicio = inicio;
    this._fin = fin;
    this._modalidad = cambios.modalidad ?? this._modalidad;
    this._lugar = lugar;
  }

  cancelar(): void {
    if (this._estado !== "PROGRAMADA" && this._estado !== "ABIERTA") {
      throw new ErrorDeDominio("TRANSICION_INVALIDA");
    }
    this._estado = "CANCELADA";
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
