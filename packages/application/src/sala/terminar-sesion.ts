import { ErrorDeDominio } from "@kuorum/domain";
import type { RepositorioDePreguntas } from "../puertos/repositorio-de-preguntas.js";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { UnidadDeTrabajo } from "../puertos/unidad-de-trabajo.js";
import { obtenerSesion } from "./obtener-sesion.js";

export class TerminarSesion {
  constructor(
    private readonly sesiones: RepositorioDeSesiones,
    private readonly preguntas: RepositorioDePreguntas,
    private readonly unidad: UnidadDeTrabajo,
  ) {}

  ejecutar(sesionId: string): Promise<void> {
    return this.unidad.ejecutar(async () => {
      const sesion = await obtenerSesion(this.sesiones, sesionId);
      if ((await this.preguntas.abiertaDeSesion(sesion.id)) !== null) {
        throw new ErrorDeDominio("SESION_CON_VOTACION_ABIERTA");
      }
      sesion.terminar();
      sesion.registrarCambio();
      await this.sesiones.guardar(sesion);
    });
  }
}
