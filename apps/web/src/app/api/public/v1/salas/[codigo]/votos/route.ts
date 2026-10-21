import { esquemaVoto } from "@kuorum/contracts";
import { contenedor } from "../../../../../../../composicion";
import { accionDeParticipante } from "../../../../../../../http/accion-de-sala";
import { leerCuerpo } from "../../../../../../../http/cuerpo";
import { accion, solicitudInvalida } from "../../../../../../../http/respuestas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function POST(
  request: Request,
  contexto: { params: Promise<{ codigo: string }> },
): Promise<Response> {
  return accionDeParticipante(
    request,
    contexto,
    async ({ participanteId }) => {
      const cuerpo = await leerCuerpo(request, esquemaVoto);
      if (cuerpo === undefined) return solicitudInvalida();
      await contenedor().emitirVoto.ejecutar(participanteId, cuerpo.preguntaId, cuerpo.opcionId);
      return accion({ votado: true }, 201);
    },
    "votos",
  );
}
