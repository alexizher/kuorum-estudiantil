import { exigirMesa } from "./exigir-mesa";
import { respuestaDeError } from "./respuesta-de-error";

/** Plantilla de las rutas de la mesa: exige sesión y traduce errores. Todo va sin caché. */
export async function accionDeMesa(
  solicitud: Request,
  trabajo: () => Promise<Response>,
): Promise<Response> {
  const actor = await exigirMesa(solicitud);
  if (actor instanceof Response) return actor;
  try {
    return await trabajo();
  } catch (error) {
    return respuestaDeError(error);
  }
}
