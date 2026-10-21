import { exigirMesa, type Actor } from "./exigir-mesa";
import { respuestaDeError } from "./respuesta-de-error";

/**
 * Plantilla de las rutas de la mesa: exige sesión, entrega el actor al trabajo y traduce errores.
 * Todo va sin caché.
 */
export async function accionDeMesa(
  solicitud: Request,
  trabajo: (actor: Actor) => Promise<Response>,
): Promise<Response> {
  const actor = await exigirMesa(solicitud);
  if (actor instanceof Response) return actor;
  try {
    return await trabajo(actor);
  } catch (error) {
    return respuestaDeError(error);
  }
}
