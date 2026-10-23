import { etiquetaDeEstado } from "@kuorum/application";
import { contenedor } from "@/composicion";
import { respuestaConEtag } from "@/http/estado-condicional";
import {
  CACHE_NO_ENCONTRADO,
  respuestaDeError,
} from "@/http/respuesta-de-error";
import { codigoDeSalaDeLaUrl } from "@/http/sesion-de-participante";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  contexto: { params: Promise<{ codigo: string }> },
): Promise<Response> {
  try {
    const codigo = codigoDeSalaDeLaUrl((await contexto.params).codigo);
    const estado = await contenedor().consultarEstadoDeSala.ejecutar(codigo);
    return respuestaConEtag(request, etiquetaDeEstado(estado), estado);
  } catch (error) {
    return respuestaDeError(error, { cacheEn404: CACHE_NO_ENCONTRADO });
  }
}
