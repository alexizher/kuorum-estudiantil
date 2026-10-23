import { esquemaActa } from "@kuorum/contracts";
import { contenedor } from "@/composicion";
import { accionDeMesa } from "@/http/accion-de-mesa";
import { leerCuerpo } from "@/http/cuerpo";
import { accion, sinContenido, solicitudInvalida } from "@/http/respuestas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  contexto: { params: Promise<{ id: string }> },
): Promise<Response> {
  return accionDeMesa(request, async (actor) => {
    const { id } = await contexto.params;
    const { acta, vistaPrevia } = await contenedor().obtenerActaDeLaMesa.ejecutar(actor, id);
    return accion({
      estado: acta.estado,
      desarrollo: acta.desarrollo,
      codigo: acta.codigo?.valor ?? null,
      finalizadaEn: acta.finalizadaEn?.toISOString() ?? null,
      vistaPrevia,
    });
  });
}

export async function PUT(
  request: Request,
  contexto: { params: Promise<{ id: string }> },
): Promise<Response> {
  return accionDeMesa(request, async (actor) => {
    const cuerpo = await leerCuerpo(request, esquemaActa);
    if (cuerpo === undefined) return solicitudInvalida();
    const { id } = await contexto.params;
    await contenedor().editarActa.ejecutar(actor, id, cuerpo.desarrollo);
    return sinContenido();
  });
}
