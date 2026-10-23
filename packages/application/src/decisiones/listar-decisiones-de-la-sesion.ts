import type { Decision } from "@kuorum/domain";
import type { RepositorioDeDecisiones } from "../puertos/repositorio-de-decisiones.js";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { Actor } from "../sala/actor.js";
import { obtenerSesionDeLaMesa } from "../sala/obtener-sesion-de-la-mesa.js";

/** Para la mesa: las decisiones de una sesión que el actor puede conducir. */
export class ListarDecisionesDeLaSesion {
  constructor(
    private readonly decisiones: RepositorioDeDecisiones,
    private readonly sesiones: RepositorioDeSesiones,
  ) {}

  async ejecutar(actor: Actor, sesionId: string): Promise<Decision[]> {
    const sesion = await obtenerSesionDeLaMesa(this.sesiones, actor, sesionId);
    return this.decisiones.deSesion(sesion.id);
  }
}
