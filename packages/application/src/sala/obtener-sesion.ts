import { SesionNoEncontrada, type Sesion } from "@kuorum/domain";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";

export async function obtenerSesion(
  repositorio: RepositorioDeSesiones,
  id: string,
): Promise<Sesion> {
  const sesion = await repositorio.porId(id);
  if (sesion === null) throw new SesionNoEncontrada(id);
  return sesion;
}
