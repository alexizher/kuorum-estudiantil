import { esquemaPedirPalabra } from "@kuorum/contracts";
import { contenedor } from "@/composicion";
import { accionDeParticipante, sesionIdDeSala } from "@/http/accion-de-sala";
import { leerCuerpo } from "@/http/cuerpo";
import { accion, solicitudInvalida } from "@/http/respuestas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function POST(
  request: Request,
  contexto: { params: Promise<{ codigo: string }> },
): Promise<Response> {
  return accionDeParticipante(request, contexto, async ({ codigo, participanteId }) => {
    const cuerpo = await leerCuerpo(request, esquemaPedirPalabra);
    if (cuerpo === undefined) return solicitudInvalida();
    const solicitudId = await contenedor().pedirLaPalabra.ejecutar(
      participanteId,
      await sesionIdDeSala(codigo),
      cuerpo.nombreVisible,
    );
    return accion({ solicitudId }, 201);
  });
}
