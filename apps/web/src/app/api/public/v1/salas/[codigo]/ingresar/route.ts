import { esquemaIngresar } from "@kuorum/contracts";
import { contenedor } from "@/composicion";
import { leerCuerpo } from "@/http/cuerpo";
import { excedeElLimiteDeIngreso } from "@/http/limite-de-tasa";
import { respuestaDeError } from "@/http/respuesta-de-error";
import {
  accion,
  demasiadasSolicitudes,
  solicitudInvalida,
} from "@/http/respuestas";
import {
  codigoDeSalaDeLaUrl,
  cookieDeParticipante,
  leer,
} from "@/http/sesion-de-participante";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  contexto: { params: Promise<{ codigo: string }> },
): Promise<Response> {
  try {
    if (excedeElLimiteDeIngreso(request)) return demasiadasSolicitudes();
    const codigo = codigoDeSalaDeLaUrl((await contexto.params).codigo);
    const cuerpo = await leerCuerpo(request, esquemaIngresar);
    if (cuerpo === undefined) return solicitudInvalida();

    // Idempotente: con una cookie válida y sin un código nuevo se conserva el participante.
    if (cuerpo.codigo === undefined && leer(request, codigo) !== null) return accion({ ok: true });

    const credencial =
      cuerpo.codigo !== undefined
        ? ({ tipo: "CODIGO", codigo: cuerpo.codigo } as const)
        : ({ tipo: "NAVEGADOR", token: cuerpo.tokenNavegador ?? "" } as const);
    const { participanteId } = await contenedor().ingresarASala.ejecutar(codigo, credencial);
    return accion({ ok: true }, 200, {
      "Set-Cookie": cookieDeParticipante(participanteId, codigo),
    });
  } catch (error) {
    return respuestaDeError(error);
  }
}
