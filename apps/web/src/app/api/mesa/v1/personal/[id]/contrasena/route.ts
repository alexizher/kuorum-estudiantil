import { contenedor } from "@/composicion";
import { accionDeMesa } from "@/http/accion-de-mesa";
import { accion } from "@/http/respuestas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Genera una contraseña nueva y cierra las sesiones abiertas de esa cuenta. */
export async function POST(
  request: Request,
  contexto: { params: Promise<{ id: string }> },
): Promise<Response> {
  return accionDeMesa(request, async (actor) => {
    const { id } = await contexto.params;
    return accion(await contenedor().restablecerContrasena.ejecutar(actor, id));
  });
}
