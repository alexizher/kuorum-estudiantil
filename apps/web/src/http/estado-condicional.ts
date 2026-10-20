export const CACHE_ESTADO = "public, max-age=0, s-maxage=2, stale-while-revalidate=2";

function coincide(ifNoneMatch: string | null, etag: string): boolean {
  if (ifNoneMatch === null) return false;
  const sinDebil = (valor: string) => valor.trim().replace(/^W\//, "");
  return ifNoneMatch.split(",").some((c) => c.trim() === "*" || sinDebil(c) === sinDebil(etag));
}

/** 200 con el cuerpo, o 304 sin cuerpo si el cliente ya tiene esa etiqueta. */
export function respuestaConEtag(solicitud: Request, etiqueta: string, cuerpo: unknown): Response {
  const cabeceras = { ETag: `W/"${etiqueta}"`, "Cache-Control": CACHE_ESTADO };
  if (coincide(solicitud.headers.get("If-None-Match"), cabeceras.ETag)) {
    return new Response(null, { status: 304, headers: cabeceras });
  }
  return Response.json(cuerpo, { headers: cabeceras });
}
