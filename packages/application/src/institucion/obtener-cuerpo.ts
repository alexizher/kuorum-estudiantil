import { ErrorDeDominio, type Cuerpo } from "@kuorum/domain";
import type { RepositorioDeCuerpos } from "../puertos/repositorio-de-cuerpos.js";

export async function obtenerCuerpo(cuerpos: RepositorioDeCuerpos, id: string): Promise<Cuerpo> {
  const cuerpo = await cuerpos.porId(id);
  if (cuerpo === null) throw new ErrorDeDominio("NO_EXISTE");
  return cuerpo;
}

/** Dos cuerpos con el mismo slug chocarían en el calendario y en la URL. */
export async function exigirSlugLibre(
  cuerpos: RepositorioDeCuerpos,
  slug: string,
  propioId?: string,
): Promise<void> {
  const otro = await cuerpos.porSlug(slug);
  if (otro !== null && otro.id !== propioId) throw new ErrorDeDominio("CUERPO_REPETIDO");
}
