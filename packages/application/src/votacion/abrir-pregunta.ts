import { ErrorDeDominio, type Reloj } from "@kuorum/domain";
import type { RepositorioDePreguntas } from "../puertos/repositorio-de-preguntas.js";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { UnidadDeTrabajo } from "../puertos/unidad-de-trabajo.js";
import type { Actor } from "../sala/actor.js";
import { obtenerPreguntaDeLaMesa } from "./obtener-pregunta.js";

export class AbrirPregunta {
  constructor(
    private readonly sesiones: RepositorioDeSesiones,
    private readonly preguntas: RepositorioDePreguntas,
    private readonly reloj: Reloj,
    private readonly unidad: UnidadDeTrabajo,
  ) {}

  ejecutar(actor: Actor, preguntaId: string): Promise<void> {
    return this.unidad.ejecutar(async () => {
      const { pregunta, sesion } = await obtenerPreguntaDeLaMesa(
        this.preguntas,
        this.sesiones,
        actor,
        preguntaId,
      );
      sesion.exigirEnCurso();
      const abierta = await this.preguntas.abiertaDeSesion(sesion.id);
      if (abierta !== null && abierta.id !== pregunta.id) {
        throw new ErrorDeDominio("OTRA_PREGUNTA_ABIERTA");
      }
      pregunta.abrir(this.reloj);
      sesion.registrarCambio();
      await this.preguntas.guardar(pregunta);
      await this.sesiones.guardar(sesion);
    });
  }
}
