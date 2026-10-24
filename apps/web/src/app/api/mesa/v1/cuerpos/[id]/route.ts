import { esquemaCambioDeCuerpo } from "@kuorum/contracts";
import { contenedor } from "@/composicion";
import { accionDeMesa } from "@/http/accion-de-mesa";
import { leerCuerpo } from "@/http/cuerpo";
import { sinContenido, solicitudInvalida } from "@/http/respuestas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** `{ nombre }` renombra; `{ archivado: true }` archiva. */
export async function PATCH(
  request: Request,
  contexto: { params: Promise<{ id: string }> },
): Promise<Response> {
  return accionDeMesa(request, async (actor) => {
    const { id } = await contexto.params;
    const cambio = await leerCuerpo(request, esquemaCambioDeCuerpo);
    if (cambio === undefined) return solicitudInvalida();
    if ("nombre" in cambio) await contenedor().renombrarCuerpo.ejecutar(actor, id, cambio.nombre);
    else await contenedor().archivarCuerpo.ejecutar(actor, id);
    return sinContenido();
  });
}
