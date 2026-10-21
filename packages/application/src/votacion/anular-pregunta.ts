import type { RepositorioDePreguntas } from "../puertos/repositorio-de-preguntas.js";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { UnidadDeTrabajo } from "../puertos/unidad-de-trabajo.js";
import { obtenerSesion } from "../sala/obtener-sesion.js";
import { obtenerPregunta } from "./obtener-pregunta.js";

export class AnularPregunta {
  constructor(
    private readonly preguntas: RepositorioDePreguntas,
    private readonly sesiones: RepositorioDeSesiones,
    private readonly unidad: UnidadDeTrabajo,
  ) {}

  ejecutar(preguntaId: string): Promise<void> {
    return this.unidad.ejecutar(async () => {
      const pregunta = await obtenerPregunta(this.preguntas, preguntaId);
      const sesion = await obtenerSesion(this.sesiones, pregunta.sesionId);
      pregunta.anular();
      sesion.registrarCambio();
      await this.preguntas.guardar(pregunta);
      await this.sesiones.guardar(sesion);
    });
  }
}
