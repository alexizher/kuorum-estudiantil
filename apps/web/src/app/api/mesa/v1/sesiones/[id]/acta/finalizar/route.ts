import { contenedor } from "@/composicion";
import { accionDeMesa } from "@/http/accion-de-mesa";
import { accion } from "@/http/respuestas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  contexto: { params: Promise<{ id: string }> },
): Promise<Response> {
  return accionDeMesa(request, async (actor) => {
    const { id } = await contexto.params;
    const codigo = await contenedor().finalizarActa.ejecutar(actor, id);
    return accion({ codigo: codigo.valor });
  });
}
