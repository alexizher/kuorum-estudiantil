import { ErrorDeDominio, type Sesion } from "@kuorum/domain";
import type { Actor } from "./actor.js";

/**
 * La cuenta de prueba solo entra a las sesiones que creó ella. SUPERADMIN y MESA entran a todas.
 * La API traduce SESION_AJENA a 404 para no revelar que la sesión existe.
 */
export function exigirAccesoASesion(actor: Actor, sesion: Sesion): void {
  if (actor.rol === "DEMO" && sesion.creadaPorId !== actor.id) {
    throw new ErrorDeDominio("SESION_AJENA");
  }
}
