import { createHmac, timingSafeEqual } from "node:crypto";
import { CodigoDeSala, ErrorDeDominio } from "@kuorum/domain";
import { sinIngreso } from "./respuestas";

const DOCE_HORAS_S = 12 * 60 * 60;
const PREFIJO = "kuorum_p_";

function secreto(): string {
  const valor = process.env.KUORUM_SECRETO;
  if (valor === undefined || valor === "") {
    throw new Error(
      "Falta la variable de entorno KUORUM_SECRETO: sin ella no se pueden firmar las cookies de los participantes",
    );
  }
  return valor;
}

function mac(participanteId: string, codigo: string): Buffer {
  return createHmac("sha256", secreto()).update(`${participanteId}.${codigo}`).digest();
}

export function nombreDeCookie(codigo: string): string {
  return `${PREFIJO}${codigo}`;
}

/** Valor de la cookie: `<participanteId>.<base64url HMAC-SHA256(id.CODIGO)>`. */
export function firmar(participanteId: string, codigo: string): string {
  return `${participanteId}.${mac(participanteId, codigo).toString("base64url")}`;
}

/** Cabecera Set-Cookie del participante de esa sala. */
export function cookieDeParticipante(participanteId: string, codigo: string): string {
  const partes = [
    `${nombreDeCookie(codigo)}=${firmar(participanteId, codigo)}`,
    "Path=/",
    `Max-Age=${DOCE_HORAS_S}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (process.env.NODE_ENV === "production") partes.push("Secure");
  return partes.join("; ");
}

function valorDeCookie(solicitud: Request, nombre: string): string | null {
  for (const par of (solicitud.headers.get("cookie") ?? "").split(";")) {
    const corte = par.indexOf("=");
    if (corte !== -1 && par.slice(0, corte).trim() === nombre) return par.slice(corte + 1).trim();
  }
  return null;
}

/** El participante de la cookie de esa sala, o null si falta o no verifica. */
export function leer(solicitud: Request, codigo: string): string | null {
  const valor = valorDeCookie(solicitud, nombreDeCookie(codigo));
  if (valor === null) return null;
  const corte = valor.lastIndexOf(".");
  if (corte <= 0) return null;
  const participanteId = valor.slice(0, corte);
  const recibida = Buffer.from(valor.slice(corte + 1), "base64url");
  const esperada = mac(participanteId, codigo);
  if (recibida.length !== esperada.length || !timingSafeEqual(recibida, esperada)) return null;
  return participanteId;
}

/** Código de sala de la URL en su forma canónica; 404 SALA_NO_DISPONIBLE si no tiene formato. */
export function codigoDeSalaDeLaUrl(texto: string): string {
  try {
    return CodigoDeSala.crear(decodeURIComponent(texto)).valor;
  } catch {
    throw new ErrorDeDominio("SALA_NO_DISPONIBLE");
  }
}

/** El participante de la sala, o la respuesta 401 SIN_INGRESO. */
export function exigirParticipante(solicitud: Request, codigo: string): string | Response {
  return leer(solicitud, codigo) ?? sinIngreso();
}
