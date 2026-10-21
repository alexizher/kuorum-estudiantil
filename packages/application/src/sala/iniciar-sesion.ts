import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { UnidadDeTrabajo } from "../puertos/unidad-de-trabajo.js";
import type { Actor } from "./actor.js";
import { obtenerSesionDeLaMesa } from "./obtener-sesion-de-la-mesa.js";

export class IniciarSesion {
  constructor(
    private readonly sesiones: RepositorioDeSesiones,
    private readonly unidad: UnidadDeTrabajo,
  ) {}

  ejecutar(actor: Actor, sesionId: string): Promise<void> {
    return this.unidad.ejecutar(async () => {
      const sesion = await obtenerSesionDeLaMesa(this.sesiones, actor, sesionId);
      sesion.iniciar();
      sesion.registrarCambio();
      await this.sesiones.guardar(sesion);
    });
  }
}
