import { Resultado, type Pregunta, type RegistroDeVotos } from "@kuorum/domain";
import type { RepositorioDePreguntas } from "../puertos/repositorio-de-preguntas.js";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { Actor } from "../sala/actor.js";
import { obtenerSesionDeLaMesa } from "../sala/obtener-sesion-de-la-mesa.js";

export interface PreguntaConResultado {
  pregunta: Pregunta;
  /** Solo las cerradas; la mesa lo ve antes de proyectarlo. */
  resultado: Resultado | null;
}

/** Para la mesa: todas las preguntas de la sesión, borradores incluidos, en orden de creación. */
export class ListarPreguntasDeSesion {
  constructor(
    private readonly sesiones: RepositorioDeSesiones,
    private readonly preguntas: RepositorioDePreguntas,
    private readonly votos: RegistroDeVotos,
  ) {}

  async ejecutar(actor: Actor, sesionId: string): Promise<PreguntaConResultado[]> {
    await obtenerSesionDeLaMesa(this.sesiones, actor, sesionId);
    const preguntas = await this.preguntas.deSesion(sesionId);
    return Promise.all(
      preguntas.map(async (pregunta) => ({
        pregunta,
        resultado:
          pregunta.estado === "CERRADA"
            ? Resultado.calcular(pregunta, await this.votos.conteos(pregunta.id))
            : null,
      })),
    );
  }
}
