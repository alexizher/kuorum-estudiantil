import { contenedor } from "../../../../../../../composicion";
import { accionDeMesa } from "../../../../../../../http/accion-de-mesa";
import { accion } from "../../../../../../../http/respuestas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  contexto: { params: Promise<{ id: string }> },
): Promise<Response> {
  return accionDeMesa(request, async () => {
    const { id } = await contexto.params;
    const resultado = await contenedor().cerrarPregunta.ejecutar(id);
    return accion({
      totalVotos: resultado.totalVotos,
      porOpcion: resultado.porOpcion,
      ganadora: resultado.ganadora,
      aprobada: resultado.aprobada,
    });
  });
}
