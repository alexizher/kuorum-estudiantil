import { esquemaEnunciado } from "@kuorum/contracts";
import { contenedor } from "../../../../../../composicion";
import { accionDeMesa } from "../../../../../../http/accion-de-mesa";
import { leerCuerpo } from "../../../../../../http/cuerpo";
import { sinContenido, solicitudInvalida } from "../../../../../../http/respuestas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  contexto: { params: Promise<{ id: string }> },
): Promise<Response> {
  return accionDeMesa(request, async (actor) => {
    const cuerpo = await leerCuerpo(request, esquemaEnunciado);
    if (cuerpo === undefined) return solicitudInvalida();
    const { id } = await contexto.params;
    await contenedor().editarEnunciado.ejecutar(actor, id, cuerpo.enunciado);
    return sinContenido();
  });
}
