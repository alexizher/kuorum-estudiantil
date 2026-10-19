import { ErrorDeDominio, SesionNoEncontrada } from "@kuorum/domain";

export const CACHE_NO_ENCONTRADO = "public, max-age=0, s-maxage=1";

export function respuestaDeError(error: unknown): Response {
  if (error instanceof SesionNoEncontrada) {
    return Response.json(
      { error: error.codigo },
      { status: 404, headers: { "Cache-Control": CACHE_NO_ENCONTRADO } },
    );
  }
  if (error instanceof ErrorDeDominio) {
    return Response.json(
      { error: error.codigo },
      { status: 422, headers: { "Cache-Control": "no-store" } },
    );
  }
  console.error(error);
  return Response.json(
    { error: "ERROR_INTERNO" },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}
