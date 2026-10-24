import { esquemaCuerpo } from "@kuorum/contracts";
import { contenedor } from "@/composicion";
import { accionDeMesa } from "@/http/accion-de-mesa";
import { leerCuerpo } from "@/http/cuerpo";
import { accion, solicitudInvalida } from "@/http/respuestas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function POST(request: Request): Promise<Response> {
  return accionDeMesa(request, async (actor) => {
    const datos = await leerCuerpo(request, esquemaCuerpo);
    if (datos === undefined) return solicitudInvalida();
    const cuerpo = await contenedor().crearCuerpo.ejecutar(actor, datos.nombre);
    return accion(
      {
        id: cuerpo.id,
        nombre: cuerpo.nombre,
        slug: cuerpo.slug,
        tipo: cuerpo.tipo,
        archivado: cuerpo.archivado,
      },
      201,
    );
  });
}
