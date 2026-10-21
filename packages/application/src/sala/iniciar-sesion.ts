import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { UnidadDeTrabajo } from "../puertos/unidad-de-trabajo.js";
import { obtenerSesion } from "./obtener-sesion.js";

export class IniciarSesion {
  constructor(
    private readonly sesiones: RepositorioDeSesiones,
    private readonly unidad: UnidadDeTrabajo,
  ) {}

  ejecutar(sesionId: string): Promise<void> {
    return this.unidad.ejecutar(async () => {
      const sesion = await obtenerSesion(this.sesiones, sesionId);
      sesion.iniciar();
      sesion.registrarCambio();
      await this.sesiones.guardar(sesion);
    });
  }
}
