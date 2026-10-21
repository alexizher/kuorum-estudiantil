import type { Pregunta } from "@kuorum/domain";
import type { RepositorioDePreguntas } from "../puertos/repositorio-de-preguntas.js";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import { obtenerSesion } from "../sala/obtener-sesion.js";

/** Para la mesa: todas las preguntas de la sesión, borradores incluidos, en orden de creación. */
export class ListarPreguntasDeSesion {
  constructor(
    private readonly sesiones: RepositorioDeSesiones,
    private readonly preguntas: RepositorioDePreguntas,
  ) {}

  async ejecutar(sesionId: string): Promise<Pregunta[]> {
    await obtenerSesion(this.sesiones, sesionId);
    return this.preguntas.deSesion(sesionId);
  }
}
