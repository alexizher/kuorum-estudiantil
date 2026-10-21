import { ColaDeIntervenciones, type Sesion } from "@kuorum/domain";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { RepositorioDeSolicitudes } from "../puertos/repositorio-de-solicitudes.js";
import type { Actor } from "../sala/actor.js";
import { obtenerSesion } from "../sala/obtener-sesion.js";
import { obtenerSesionDeLaMesa } from "../sala/obtener-sesion-de-la-mesa.js";

export interface ColaDeLaSesion {
  sesion: Sesion;
  cola: ColaDeIntervenciones;
}

async function armarCola(
  sesion: Sesion,
  solicitudes: RepositorioDeSolicitudes,
): Promise<ColaDeLaSesion> {
  sesion.exigirEnCurso();
  const cola = new ColaDeIntervenciones(
    await solicitudes.deSesion(sesion.id),
    sesion.segundosPorIntervencion,
    sesion.id,
  );
  return { sesion, cola };
}

/** Para la sala (participantes): carga la sesión, exige que esté en curso y arma su cola. */
export async function cargarColaDeLaSesion(
  sesiones: RepositorioDeSesiones,
  solicitudes: RepositorioDeSolicitudes,
  sesionId: string,
): Promise<ColaDeLaSesion> {
  return armarCola(await obtenerSesion(sesiones, sesionId), solicitudes);
}

/** Para la mesa: igual, pero antes comprueba que el actor pueda entrar a la sesión. */
export async function cargarColaDeLaMesa(
  sesiones: RepositorioDeSesiones,
  solicitudes: RepositorioDeSolicitudes,
  actor: Actor,
  sesionId: string,
): Promise<ColaDeLaSesion> {
  return armarCola(await obtenerSesionDeLaMesa(sesiones, actor, sesionId), solicitudes);
}

/** Guarda las solicitudes que cambiaron y sube la versión de la sesión. */
export async function guardarColaDeLaSesion(
  sesiones: RepositorioDeSesiones,
  solicitudes: RepositorioDeSolicitudes,
  { sesion, cola }: ColaDeLaSesion,
): Promise<void> {
  for (const solicitud of cola.cambiadas()) await solicitudes.guardar(solicitud);
  sesion.registrarCambio();
  await sesiones.guardar(sesion);
}
