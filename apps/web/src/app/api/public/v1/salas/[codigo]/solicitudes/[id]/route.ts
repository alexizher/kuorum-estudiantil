import { contenedor } from "../../../../../../../../composicion";
import { accionDeParticipante } from "../../../../../../../../http/accion-de-sala";
import { sinContenido } from "../../../../../../../../http/respuestas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  contexto: { params: Promise<{ codigo: string; id: string }> },
): Promise<Response> {
  return accionDeParticipante(request, contexto, async ({ participanteId }) => {
    const { id } = await contexto.params;
    await contenedor().retirarSolicitud.ejecutar(participanteId, id);
    return sinContenido();
  });
}
