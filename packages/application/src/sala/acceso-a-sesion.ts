import { ErrorDeDominio, type Sesion } from "@kuorum/domain";
import { puedeConducir, puedeGestionar } from "../institucion/permisos.js";
import type { Actor } from "./actor.js";

/**
 * Quien no puede conducir la sesión recibe SESION_AJENA. La API la traduce a 404 para no
 * revelar que la sesión existe.
 */
export function exigirAccesoASesion(actor: Actor, sesion: Sesion): void {
  if (!puedeConducir(actor, sesion)) throw new ErrorDeDominio("SESION_AJENA");
}

export function exigirGestionDeSesion(actor: Actor, sesion: Sesion): void {
  if (!puedeGestionar(actor, sesion)) throw new ErrorDeDominio("SESION_AJENA");
}
