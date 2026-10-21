import { esquemaDarLaPalabra } from "@kuorum/contracts";
import { contenedor } from "../../../../../../../../composicion";
import { accionDeMesa } from "../../../../../../../../http/accion-de-mesa";
import { leerCuerpo } from "../../../../../../../../http/cuerpo";
import { sinContenido, solicitudInvalida } from "../../../../../../../../http/respuestas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Sin `solicitudId` da la palabra a quien sigue en la fila. */
export async function POST(
  request: Request,
  contexto: { params: Promise<{ id: string }> },
): Promise<Response> {
  return accionDeMesa(request, async (actor) => {
    const cuerpo = await leerCuerpo(request, esquemaDarLaPalabra, true);
    if (cuerpo === undefined) return solicitudInvalida();
    const { id } = await contexto.params;
    await contenedor().darLaPalabra.ejecutar(actor, id, cuerpo.solicitudId ?? null);
    return sinContenido();
  });
}
