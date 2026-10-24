import { contenedor } from "@/composicion";
import { accionDeMesa } from "@/http/accion-de-mesa";
import { accion } from "@/http/respuestas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  contexto: { params: Promise<{ id: string }> },
): Promise<Response> {
  return accionDeMesa(request, async (actor) => {
    const { id } = await contexto.params;
    const decisiones = await contenedor().listarDecisionesDeLaSesion.ejecutar(actor, id);
    return accion({
      decisiones: decisiones.map((d) => ({
        id: d.id,
        preguntaId: d.preguntaId,
        pregunta: d.pregunta,
        enunciado: d.enunciado,
        aprobada: d.aprobada,
        indicativa: d.indicativa,
        resultado: d.resultado,
      })),
    });
  });
}
