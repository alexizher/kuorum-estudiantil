import { ErrorDeDominio, SesionNoEncontrada } from "@kuorum/domain";

export const CACHE_NO_ENCONTRADO = "public, max-age=0, s-maxage=1";
const SIN_CACHE = "no-store";

/** Código de dominio a estado HTTP. Lo que no está aquí es 422. */
const ESTADO_POR_CODIGO: Readonly<Record<string, number>> = {
  SALA_NO_DISPONIBLE: 404,
  PREGUNTA_NO_ENCONTRADA: 404,
  SESION_NO_ENCONTRADA: 404,
  YA_VOTO: 409,
  PREGUNTA_CERRADA: 409,
  OTRA_PREGUNTA_ABIERTA: 409,
  YA_EN_LA_FILA: 409,
  CIERRE_OCUPADO: 409,
  TRANSICION_INVALIDA: 409,
  SESION_NO_EN_CURSO: 409,
  SESION_NO_DISPONIBLE: 409,
  PARTICIPANTE_AJENO: 403,
  NO_ES_TUYA: 403,
};

/** Textos que la interfaz muestra tal cual. */
const MENSAJE_POR_CODIGO: Readonly<Record<string, string>> = {
  YA_VOTO: "Ya votaste en esta pregunta.",
  PREGUNTA_CERRADA: "La votación ya se cerró.",
  SALA_NO_DISPONIBLE: "Esta sala no existe o ya terminó.",
  CODIGO_NO_EXISTE: "Ese código no es de esta sala.",
};

/** CIERRE_OCUPADO lleva su propio mensaje, con el consejo para la mesa. */
const CODIGOS_CON_MENSAJE_DE_DOMINIO: readonly string[] = ["CIERRE_OCUPADO"];

export interface OpcionesDeError {
  /** Cabecera de caché para el 404 (solo el estado público, que es cacheable). */
  cacheEn404?: string;
}

export function respuestaDeError(error: unknown, opciones: OpcionesDeError = {}): Response {
  if (error instanceof ErrorDeDominio) {
    const estado =
      error instanceof SesionNoEncontrada ? 404 : (ESTADO_POR_CODIGO[error.codigo] ?? 422);
    const mensaje = CODIGOS_CON_MENSAJE_DE_DOMINIO.includes(error.codigo)
      ? error.message
      : MENSAJE_POR_CODIGO[error.codigo];
    return Response.json(
      mensaje === undefined ? { error: error.codigo } : { error: error.codigo, mensaje },
      {
        status: estado,
        headers: {
          "Cache-Control": estado === 404 ? (opciones.cacheEn404 ?? SIN_CACHE) : SIN_CACHE,
        },
      },
    );
  }
  console.error(error);
  return Response.json(
    { error: "ERROR_INTERNO" },
    { status: 500, headers: { "Cache-Control": SIN_CACHE } },
  );
}
