import { ColaDeIntervenciones, type Sesion } from "@kuorum/domain";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { RepositorioDeSolicitudes } from "../puertos/repositorio-de-solicitudes.js";
import { obtenerSesion } from "../sala/obtener-sesion.js";

export interface ColaDeLaSesion {
  sesion: Sesion;
  cola: ColaDeIntervenciones;
}

/** Carga la sesión, exige que esté en curso y arma su cola. Va dentro de una unidad de trabajo. */
export async function cargarColaDeLaSesion(
  sesiones: RepositorioDeSesiones,
  solicitudes: RepositorioDeSolicitudes,
  sesionId: string,
): Promise<ColaDeLaSesion> {
  const sesion = await obtenerSesion(sesiones, sesionId);
  sesion.exigirEnCurso();
  const cola = new ColaDeIntervenciones(
    await solicitudes.deSesion(sesionId),
    sesion.segundosPorIntervencion,
    sesionId,
  );
  return { sesion, cola };
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
