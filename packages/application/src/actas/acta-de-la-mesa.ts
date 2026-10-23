import { Acta, ErrorDeDominio, type Sesion } from "@kuorum/domain";
import type { RepositorioDeActas } from "../puertos/repositorio-de-actas.js";

/**
 * El acta de una sesión terminada. Las que terminaron antes de existir las actas no tienen
 * borrador guardado: se les da uno nuevo.
 */
export async function actaDeLaMesa(actas: RepositorioDeActas, sesion: Sesion): Promise<Acta> {
  const acta = await actas.deSesion(sesion.id);
  if (acta !== null) return acta;
  if (sesion.estado === "CERRADA") return Acta.borrador(sesion.id);
  throw new ErrorDeDominio("ACTA_NO_ENCONTRADA");
}
