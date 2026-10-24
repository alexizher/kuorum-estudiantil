import { contenedor } from "@/composicion";
import { accionDeMesa } from "@/http/accion-de-mesa";
import { sinContenido } from "@/http/respuestas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  contexto: { params: Promise<{ id: string }> },
): Promise<Response> {
  return accionDeMesa(request, async (actor) => {
    const { id } = await contexto.params;
    await contenedor().cancelarSesion.ejecutar(actor, id);
    return sinContenido();
  });
}
