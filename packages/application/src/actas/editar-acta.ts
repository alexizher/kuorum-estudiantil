import type { RepositorioDeActas } from "../puertos/repositorio-de-actas.js";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { UnidadDeTrabajo } from "../puertos/unidad-de-trabajo.js";
import type { Actor } from "../sala/actor.js";
import { bloquearSesionDeLaMesa } from "../sala/obtener-sesion-de-la-mesa.js";
import { actaDeLaMesa } from "./acta-de-la-mesa.js";

export class EditarActa {
  constructor(
    private readonly sesiones: RepositorioDeSesiones,
    private readonly actas: RepositorioDeActas,
    private readonly unidad: UnidadDeTrabajo,
  ) {}

  ejecutar(actor: Actor, sesionId: string, desarrollo: string): Promise<void> {
    return this.unidad.ejecutar(async () => {
      const sesion = await bloquearSesionDeLaMesa(this.sesiones, actor, sesionId);
      const acta = await actaDeLaMesa(this.actas, sesion);
      acta.editar(desarrollo);
      await this.actas.guardar(acta);
    });
  }
}
