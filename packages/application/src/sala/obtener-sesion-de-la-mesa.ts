import { SesionNoEncontrada, type Sesion } from "@kuorum/domain";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { Actor } from "./actor.js";
import { exigirAccesoASesion } from "./acceso-a-sesion.js";
import { obtenerSesion } from "./obtener-sesion.js";

/** Carga una sesión para el actor de la mesa; ajena a la cuenta de prueba es SESION_AJENA. */
export async function obtenerSesionDeLaMesa(
  repositorio: RepositorioDeSesiones,
  actor: Actor,
  id: string,
): Promise<Sesion> {
  const sesion = await obtenerSesion(repositorio, id);
  exigirAccesoASesion(actor, sesion);
  return sesion;
}

/** Igual, con el candado de la sesión tomado: lo que se lea después ya no cambia por debajo. */
export async function bloquearSesionDeLaMesa(
  repositorio: RepositorioDeSesiones,
  actor: Actor,
  id: string,
): Promise<Sesion> {
  const sesion = await repositorio.porIdBloqueando(id);
  if (sesion === null) throw new SesionNoEncontrada(id);
  exigirAccesoASesion(actor, sesion);
  return sesion;
}

/** Para las páginas del servidor que leen una sola sesión. */
export class ObtenerSesionDeLaMesa {
  constructor(private readonly sesiones: RepositorioDeSesiones) {}

  ejecutar(actor: Actor, id: string): Promise<Sesion> {
    return obtenerSesionDeLaMesa(this.sesiones, actor, id);
  }
}
