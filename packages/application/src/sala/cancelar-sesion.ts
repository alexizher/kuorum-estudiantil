import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { UnidadDeTrabajo } from "../puertos/unidad-de-trabajo.js";
import { exigirGestionDeSesion } from "./acceso-a-sesion.js";
import type { Actor } from "./actor.js";
import { obtenerSesion } from "./obtener-sesion.js";

export class CancelarSesion {
  constructor(
    private readonly sesiones: RepositorioDeSesiones,
    private readonly unidad: UnidadDeTrabajo,
  ) {}

  ejecutar(actor: Actor, sesionId: string): Promise<void> {
    return this.unidad.ejecutar(async () => {
      const sesion = await obtenerSesion(this.sesiones, sesionId);
      exigirGestionDeSesion(actor, sesion);
      sesion.cancelar();
      sesion.registrarCambio();
      await this.sesiones.guardar(sesion);
    });
  }
}
