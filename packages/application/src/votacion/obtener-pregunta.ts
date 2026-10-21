import { ErrorDeDominio, type Pregunta, type Sesion } from "@kuorum/domain";
import type { RepositorioDePreguntas } from "../puertos/repositorio-de-preguntas.js";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { Actor } from "../sala/actor.js";
import { exigirAccesoASesion } from "../sala/acceso-a-sesion.js";
import { obtenerSesion } from "../sala/obtener-sesion.js";

export async function obtenerPregunta(
  repositorio: RepositorioDePreguntas,
  id: string,
): Promise<Pregunta> {
  const pregunta = await repositorio.porId(id);
  if (pregunta === null) throw new ErrorDeDominio("PREGUNTA_NO_ENCONTRADA");
  return pregunta;
}

/**
 * Pregunta y sesión para la mesa. Si la sesión es ajena a la cuenta de prueba, responde
 * PREGUNTA_NO_ENCONTRADA: igual que una pregunta que no existe, sin revelar que está.
 */
export async function obtenerPreguntaDeLaMesa(
  preguntas: RepositorioDePreguntas,
  sesiones: RepositorioDeSesiones,
  actor: Actor,
  preguntaId: string,
): Promise<{ pregunta: Pregunta; sesion: Sesion }> {
  const pregunta = await obtenerPregunta(preguntas, preguntaId);
  const sesion = await obtenerSesion(sesiones, pregunta.sesionId);
  try {
    exigirAccesoASesion(actor, sesion);
  } catch (error) {
    if (error instanceof ErrorDeDominio && error.codigo === "SESION_AJENA") {
      throw new ErrorDeDominio("PREGUNTA_NO_ENCONTRADA");
    }
    throw error;
  }
  return { pregunta, sesion };
}
