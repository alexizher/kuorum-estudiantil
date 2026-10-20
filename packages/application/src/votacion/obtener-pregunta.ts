import { ErrorDeDominio, type Pregunta } from "@kuorum/domain";
import type { RepositorioDePreguntas } from "../puertos/repositorio-de-preguntas.js";

export async function obtenerPregunta(
  repositorio: RepositorioDePreguntas,
  id: string,
): Promise<Pregunta> {
  const pregunta = await repositorio.porId(id);
  if (pregunta === null) throw new ErrorDeDominio("PREGUNTA_NO_ENCONTRADA");
  return pregunta;
}
