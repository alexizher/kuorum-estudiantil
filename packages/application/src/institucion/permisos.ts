import { ErrorDeDominio, type Cuerpo, type Sesion } from "@kuorum/domain";
import type { Actor, RolEnCuerpo } from "../sala/actor.js";

function rolEn(actor: Actor, cuerpoId: string): RolEnCuerpo | null {
  return actor.membresias.find((m) => m.cuerpoId === cuerpoId)?.rol ?? null;
}

/** Programar sesiones nuevas en ese cuerpo. */
export function puedeProgramarEn(actor: Actor, cuerpo: Cuerpo): boolean {
  if (cuerpo.archivado) return false;
  if (actor.rol === "SUPERADMIN" || actor.rol === "DEMO") return true;
  return rolEn(actor, cuerpo.id) === "ENCARGADO";
}

/** Llevar la sala: iniciar, dar la palabra, votar, terminar. */
export function puedeConducir(actor: Actor, sesion: Sesion): boolean {
  if (actor.rol === "SUPERADMIN") return true;
  if (actor.rol === "DEMO") return sesion.creadaPorId === actor.id;
  // Lo de la cuenta de prueba es público y desechable: el personal no lo toca.
  return !sesion.creadaPorDemo && rolEn(actor, sesion.cuerpoId) !== null;
}

/** Reprogramar o cancelar. */
export function puedeGestionar(actor: Actor, sesion: Sesion): boolean {
  if (actor.rol !== "MESA") return puedeConducir(actor, sesion);
  return !sesion.creadaPorDemo && rolEn(actor, sesion.cuerpoId) === "ENCARGADO";
}

export function exigirAdministrador(actor: Actor): void {
  if (actor.rol !== "SUPERADMIN") throw new ErrorDeDominio("SOLO_ADMINISTRADOR");
}
