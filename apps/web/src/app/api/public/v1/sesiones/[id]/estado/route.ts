import type { EstadoPublicoDeSesion } from "@kuorum/contracts";
import { contenedor } from "../../../../../../../composicion";
import { respuestaDeError } from "../../../../../../../http/respuesta-de-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CACHE_ESTADO = "public, max-age=0, s-maxage=2, stale-while-revalidate=2";

function coincide(ifNoneMatch: string | null, etag: string): boolean {
  if (ifNoneMatch === null) return false;
  const sinDebil = (valor: string) => valor.trim().replace(/^W\//, "");
  return ifNoneMatch.split(",").some((c) => c.trim() === "*" || sinDebil(c) === sinDebil(etag));
}

export async function GET(
  request: Request,
  contexto: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await contexto.params;
    const instantanea = await contenedor().consultarEstadoDeSesion.ejecutar(id);
    const cabeceras = {
      ETag: `W/"${instantanea.etiqueta()}"`,
      "Cache-Control": CACHE_ESTADO,
    };
    if (coincide(request.headers.get("If-None-Match"), cabeceras.ETag)) {
      return new Response(null, { status: 304, headers: cabeceras });
    }
    const cuerpo: EstadoPublicoDeSesion = {
      sesionId: instantanea.sesionId,
      estado: instantanea.estado,
      version: instantanea.version,
      actualizadaEn: instantanea.actualizadaEn.toISOString(),
    };
    return Response.json(cuerpo, { headers: cabeceras });
  } catch (error) {
    return respuestaDeError(error);
  }
}
