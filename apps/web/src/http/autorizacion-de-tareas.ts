import { createHash, timingSafeEqual } from "node:crypto";

const PREFIJO = "Bearer ";

function huella(texto: string): Buffer {
  return createHash("sha256").update(texto).digest();
}

/**
 * Las tareas programadas de Vercel llegan con `Authorization: Bearer ${CRON_SECRET}`.
 * Sin CRON_SECRET definido no entra nadie. La comparación es de tiempo constante: se comparan
 * los SHA-256, que miden lo mismo aunque los textos no.
 */
export function esTareaAutorizada(solicitud: Request, secreto: string | undefined): boolean {
  if (secreto === undefined || secreto === "") return false;
  const cabecera = solicitud.headers.get("authorization");
  if (cabecera === null || !cabecera.startsWith(PREFIJO)) return false;
  return timingSafeEqual(huella(cabecera.slice(PREFIJO.length)), huella(secreto));
}
