import { ErrorDeDominio } from "../errores.js";
import type { GeneradorDeIds } from "../generador-de-ids.js";
import type { Reloj } from "../reloj.js";
import type { TipoDeMocion } from "./tipo-de-mocion.js";

const NOMBRE_MIN = 1;
const NOMBRE_MAX = 60;

export type EstadoDeSolicitud = "ESPERANDO" | "CON_LA_PALABRA" | "TERMINADA" | "RETIRADA" | "RECHAZADA";
export type TipoDeSolicitud = "INTERVENCION" | "MOCION";

export interface PropiedadesDeSolicitud {
  id: string;
  sesionId: string;
  participanteId: string;
  nombreVisible: string;
  tipo: TipoDeSolicitud;
  mocion: TipoDeMocion | null;
  estado: EstadoDeSolicitud;
  pedidaEn: Date;
  inicioEn: Date | null;
  finEn: Date | null;
  segundosExtra: number;
}

export interface DatosDeSolicitud {
  participanteId: string;
  nombreVisible: string;
  tipo: TipoDeSolicitud;
  mocion?: TipoDeMocion;
}

export class SolicitudDePalabra {
  private _estado: EstadoDeSolicitud;
  private _inicioEn: Date | null;
  private _finEn: Date | null;
  private _segundosExtra: number;

  private constructor(
    readonly id: string,
    readonly sesionId: string,
    readonly participanteId: string,
    readonly nombreVisible: string,
    readonly tipo: TipoDeSolicitud,
    readonly mocion: TipoDeMocion | null,
    readonly pedidaEn: Date,
    estado: EstadoDeSolicitud,
    inicioEn: Date | null,
    finEn: Date | null,
    segundosExtra: number,
  ) {
    this._estado = estado;
    this._inicioEn = inicioEn;
    this._finEn = finEn;
    this._segundosExtra = segundosExtra;
  }

  static nueva(
    sesionId: string,
    datos: DatosDeSolicitud,
    reloj: Reloj,
    generadorDeIds: GeneradorDeIds,
  ): SolicitudDePalabra {
    return SolicitudDePalabra.reconstruir({
      id: generadorDeIds.nuevo(),
      sesionId,
      participanteId: datos.participanteId,
      nombreVisible: datos.nombreVisible,
      tipo: datos.tipo,
      mocion: datos.mocion ?? null,
      estado: "ESPERANDO",
      pedidaEn: reloj.ahora(),
      inicioEn: null,
      finEn: null,
      segundosExtra: 0,
    });
  }

  static reconstruir(props: PropiedadesDeSolicitud): SolicitudDePalabra {
    const nombreVisible = props.nombreVisible.trim();
    if (nombreVisible.length < NOMBRE_MIN || nombreVisible.length > NOMBRE_MAX) {
      throw new ErrorDeDominio("NOMBRE_VISIBLE_INVALIDO");
    }
    if ((props.tipo === "MOCION") !== (props.mocion !== null)) {
      throw new ErrorDeDominio("MOCION_INVALIDA");
    }
    return new SolicitudDePalabra(
      props.id,
      props.sesionId,
      props.participanteId,
      nombreVisible,
      props.tipo,
      props.mocion,
      props.pedidaEn,
      props.estado,
      props.inicioEn,
      props.finEn,
      props.segundosExtra,
    );
  }

  get estado(): EstadoDeSolicitud {
    return this._estado;
  }

  get inicioEn(): Date | null {
    return this._inicioEn;
  }

  get finEn(): Date | null {
    return this._finEn;
  }

  get segundosExtra(): number {
    return this._segundosExtra;
  }

  get esperando(): boolean {
    return this._estado === "ESPERANDO";
  }

  darLaPalabra(reloj: Reloj): void {
    this.exigirEstado("ESPERANDO");
    this._estado = "CON_LA_PALABRA";
    this._inicioEn = reloj.ahora();
  }

  terminar(reloj: Reloj): void {
    this.exigirEstado("CON_LA_PALABRA");
    this._estado = "TERMINADA";
    this._finEn = reloj.ahora();
  }

  retirar(): void {
    this.exigirEstado("ESPERANDO");
    this._estado = "RETIRADA";
  }

  rechazar(): void {
    this.exigirEstado("ESPERANDO");
    this._estado = "RECHAZADA";
  }

  sumarSegundos(segundos: number): void {
    this.exigirEstado("CON_LA_PALABRA");
    this._segundosExtra += segundos;
  }

  private exigirEstado(esperado: EstadoDeSolicitud): void {
    if (this._estado !== esperado) {
      throw new ErrorDeDominio("SOLICITUD_NO_DISPONIBLE");
    }
  }
}
