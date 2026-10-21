const SIN_CACHE = { "Cache-Control": "no-store" };

/** Respuesta de acción: JSON sin caché. */
export function accion(cuerpo: unknown, status = 200, cabeceras?: HeadersInit): Response {
  const headers = new Headers(cabeceras);
  headers.set("Cache-Control", "no-store");
  return Response.json(cuerpo, { status, headers });
}

export function sinContenido(): Response {
  return new Response(null, { status: 204, headers: SIN_CACHE });
}

export function solicitudInvalida(): Response {
  return Response.json({ error: "SOLICITUD_INVALIDA" }, { status: 400, headers: SIN_CACHE });
}

export function sinIngreso(): Response {
  return Response.json({ error: "SIN_INGRESO" }, { status: 401, headers: SIN_CACHE });
}

export function demasiadasSolicitudes(): Response {
  return Response.json({ error: "DEMASIADAS_SOLICITUDES" }, { status: 429, headers: SIN_CACHE });
}
