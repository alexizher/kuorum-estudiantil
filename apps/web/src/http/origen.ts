/**
 * Defensa extra contra CSRF en las rutas que cambian estado con la cookie del participante.
 * `SameSite=Lax` ya impide que otro sitio mande la cookie, pero un sitio hermano (otro
 * subdominio del mismo dominio) cuenta como el mismo sitio y sí la manda. Se rechaza:
 *
 * - `Sec-Fetch-Site: cross-site`;
 * - un `Origin` cuyo host no es el propio (incluido `Origin: null`).
 *
 * Un cliente que no manda ninguna de las dos cabeceras (curl, pruebas, una app) pasa: un
 * navegador siempre manda `Origin` en un POST o un DELETE, así que el ataque desde una
 * página no puede omitirla.
 */
export function vieneDeOtroSitio(solicitud: Request): boolean {
  if (solicitud.headers.get("sec-fetch-site") === "cross-site") return true;
  const origen = solicitud.headers.get("origin");
  if (origen === null) return false;
  const host = hostDe(origen);
  return host === null || !hostsPropios(solicitud).has(host);
}

function hostDe(origen: string): string | null {
  try {
    return new URL(origen).host;
  } catch {
    return null;
  }
}

/**
 * Hosts con los que se sirve el sitio: el de la URL de la solicitud y, detrás de un proxy
 * que la reescribe, `Host` y `x-forwarded-host`. Una página de otro sitio no puede fijar
 * `x-forwarded-host` sin una consulta CORS previa, que esta API no acepta.
 */
function hostsPropios(solicitud: Request): Set<string> {
  const hosts = new Set<string>([new URL(solicitud.url).host]);
  for (const nombre of ["host", "x-forwarded-host"]) {
    const valor = solicitud.headers.get(nombre)?.split(",")[0]?.trim();
    if (valor) hosts.add(valor);
  }
  return hosts;
}
