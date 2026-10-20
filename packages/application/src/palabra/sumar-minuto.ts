import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { RepositorioDeSolicitudes } from "../puertos/repositorio-de-solicitudes.js";
import type { UnidadDeTrabajo } from "../puertos/unidad-de-trabajo.js";
import { cargarColaDeLaSesion, guardarColaDeLaSesion } from "./cola-de-la-sesion.js";

export class SumarMinuto {
  constructor(
    private readonly sesiones: RepositorioDeSesiones,
    private readonly solicitudes: RepositorioDeSolicitudes,
    private readonly unidad: UnidadDeTrabajo,
  ) {}

  ejecutar(sesionId: string): Promise<void> {
    return this.unidad.ejecutar(async () => {
      const contexto = await cargarColaDeLaSesion(this.sesiones, this.solicitudes, sesionId);
      contexto.cola.sumarMinuto();
      await guardarColaDeLaSesion(this.sesiones, this.solicitudes, contexto);
    });
  }
}
