import { ErrorDeDominio } from "../errores.js";
import type { EstadoDeSesion } from "./estado-de-sesion.js";

export class InstantaneaDeSesion {
  constructor(
    readonly sesionId: string,
    readonly estado: EstadoDeSesion,
    readonly version: number,
    readonly actualizadaEn: Date,
  ) {
    if (!Number.isInteger(version) || version < 0) {
      throw new ErrorDeDominio("VERSION_INVALIDA");
    }
  }

  etiqueta(): string {
    return `${this.sesionId}-${this.version}`;
  }
}
