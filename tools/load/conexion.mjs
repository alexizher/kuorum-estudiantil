// pg 8 trata prefer, require y verify-ca como verify-full y avisa que pg 9 cambiará eso.
// Neon entrega la URL con sslmode=require: se pide verify-full explícito, que es lo que ya se usa.
// Con uselibpqcompat=true esos modos significan otra cosa (como en libpq) y la URL no se toca.
import { URL } from "node:url";

const MODOS_EQUIVALENTES = new Set(["prefer", "require", "verify-ca"]);

/** @param {string} url */
export function normalizarSslmode(url) {
  const conexion = new URL(url);
  const modo = conexion.searchParams.get("sslmode");
  if (modo === null || !MODOS_EQUIVALENTES.has(modo)) return url;
  if (conexion.searchParams.get("uselibpqcompat") === "true") return url;
  conexion.searchParams.set("sslmode", "verify-full");
  return conexion.toString();
}
