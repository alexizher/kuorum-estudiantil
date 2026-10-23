import { ErrorDeDominio } from "@kuorum/domain";
import { puedeConducir } from "../institucion/permisos.js";
import type { RepositorioDeDecisiones } from "../puertos/repositorio-de-decisiones.js";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { UnidadDeTrabajo } from "../puertos/unidad-de-trabajo.js";
import type { Actor } from "../sala/actor.js";

export class EditarEnunciado {
  constructor(
    private readonly decisiones: RepositorioDeDecisiones,
    private readonly sesiones: RepositorioDeSesiones,
    private readonly unidad: UnidadDeTrabajo,
  ) {}

  /** Lo ajeno responde igual que lo inexistente. */
  ejecutar(actor: Actor, decisionId: string, texto: string | null): Promise<void> {
    return this.unidad.ejecutar(async () => {
      const decision = await this.decisiones.porId(decisionId);
      const sesion = decision === null ? null : await this.sesiones.porId(decision.sesionId);
      if (decision === null || sesion === null || !puedeConducir(actor, sesion)) {
        throw new ErrorDeDominio("DECISION_NO_ENCONTRADA");
      }
      if (sesion.estado === "ACTA_FINAL") throw new ErrorDeDominio("ACTA_FINALIZADA");
      decision.cambiarEnunciado(texto);
      sesion.registrarCambio();
      await this.decisiones.guardar(decision);
      await this.sesiones.guardar(sesion);
    });
  }
}
