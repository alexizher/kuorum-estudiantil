import { esquemaIngresar } from "@kuorum/contracts";
import { contenedor } from "@/composicion";
import { leerCuerpo } from "@/http/cuerpo";
import {
  excedeElLimiteDeIngreso,
  excedeElLimiteDeIngresoPorNavegador,
} from "@/http/limite-de-tasa";
import { vieneDeOtroSitio } from "@/http/origen";
import { respuestaDeError } from "@/http/respuesta-de-error";
import {
  accion,
  demasiadasSolicitudes,
  origenNoPermitido,
  solicitudInvalida,
} from "@/http/respuestas";
import { codigoDeSalaDeLaUrl, cookieDeParticipante, leer } from "@/http/sesion-de-participante";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  contexto: { params: Promise<{ codigo: string }> },
): Promise<Response> {
  // Ingresar también cambia estado: fija la cookie del participante en el navegador.
  if (vieneDeOtroSitio(request)) return origenNoPermitido();
  try {
    if (excedeElLimiteDeIngreso(request)) return demasiadasSolicitudes();
    const codigo = codigoDeSalaDeLaUrl((await contexto.params).codigo);
    const cuerpo = await leerCuerpo(request, esquemaIngresar);
    if (cuerpo === undefined) return solicitudInvalida();

    // Idempotente: con una cookie válida y sin un código nuevo se conserva el participante,
    // y se renueva la cookie para que no venza a las 12 horas en medio de una sesión.
    const actual = cuerpo.codigo === undefined ? leer(request, codigo) : null;
    if (actual !== null) {
      return accion({ ok: true }, 200, { "Set-Cookie": cookieDeParticipante(actual, codigo) });
    }
    if (cuerpo.codigo === undefined && excedeElLimiteDeIngresoPorNavegador(request)) {
      return demasiadasSolicitudes();
    }

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
