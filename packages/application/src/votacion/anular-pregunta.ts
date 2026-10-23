import type { RepositorioDeDecisiones } from "../puertos/repositorio-de-decisiones.js";
import type { RepositorioDePreguntas } from "../puertos/repositorio-de-preguntas.js";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { UnidadDeTrabajo } from "../puertos/unidad-de-trabajo.js";
import type { Actor } from "../sala/actor.js";
import { obtenerPreguntaDeLaMesa } from "./obtener-pregunta.js";

export class AnularPregunta {
  constructor(
    private readonly preguntas: RepositorioDePreguntas,
    private readonly sesiones: RepositorioDeSesiones,
    private readonly unidad: UnidadDeTrabajo,
    private readonly decisiones: RepositorioDeDecisiones,
  ) {}

  ejecutar(actor: Actor, preguntaId: string): Promise<void> {
    return this.unidad.ejecutar(async () => {
      const { pregunta, sesion } = await obtenerPreguntaDeLaMesa(
        this.preguntas,
        this.sesiones,
        actor,
        preguntaId,
      );
      pregunta.anular();
      sesion.registrarCambio();
      await this.preguntas.guardar(pregunta);
      await this.sesiones.guardar(sesion);
      // Una votación anulada no deja decisión.
      await this.decisiones.eliminarDePregunta(pregunta.id);
    });
  }
}
