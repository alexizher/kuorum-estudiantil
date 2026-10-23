import {
  CODIGOS_MAXIMOS_POR_SESION_DE_DEMO,
  CODIGOS_MAXIMOS_POR_SOLICITUD_DE_DEMO,
  LIMITE_DE_SESIONES_ACTIVAS_DE_DEMO,
  MAXIMO_DE_PREGUNTAS_POR_SESION_DE_DEMO,
  MAXIMO_DE_SESIONES_DE_DEMO,
} from "@kuorum/application";
import { ErrorDeDominio, SesionNoEncontrada } from "@kuorum/domain";

export const CACHE_NO_ENCONTRADO = "public, max-age=0, s-maxage=1";
const SIN_CACHE = "no-store";

/** Código de dominio a estado HTTP. Lo que no está aquí es 422. */
const ESTADO_POR_CODIGO: Readonly<Record<string, number>> = {
  SALA_NO_DISPONIBLE: 404,
  PREGUNTA_NO_ENCONTRADA: 404,
  SESION_NO_ENCONTRADA: 404,
  // La cuenta de prueba pidió una sesión de otra cuenta: se responde como si no existiera.
  SESION_AJENA: 404,
  YA_VOTO: 409,
  PREGUNTA_CERRADA: 409,
  OTRA_PREGUNTA_ABIERTA: 409,
  YA_EN_LA_FILA: 409,
  CIERRE_OCUPADO: 409,
  TRANSICION_INVALIDA: 409,
  SESION_NO_EN_CURSO: 409,
  SESION_NO_DISPONIBLE: 409,
  SESION_CON_VOTACION_ABIERTA: 409,
  LIMITE_DE_DEMO: 409,
  LIMITE_DE_CODIGOS_DE_DEMO: 409,
  LIMITE_DE_SESIONES_DE_DEMO: 409,
  LIMITE_DE_PREGUNTAS_DE_DEMO: 409,
  PARTICIPANTE_AJENO: 403,
  NO_ES_TUYA: 403,
  SOLO_ADMINISTRADOR: 403,
  // Un cuerpo en el que no puede programar se ve igual que uno que no existe.
  CUERPO_AJENO: 404,
  CUERPO_NO_EXISTE: 404,
  NO_EXISTE: 404,
  CUERPO_REPETIDO: 409,
  CORREO_REPETIDO: 409,
  GENERAL_NO_SE_ARCHIVA: 409,
};

/** Textos que la interfaz muestra tal cual. */
const MENSAJE_POR_CODIGO: Readonly<Record<string, string>> = {
  YA_VOTO: "Ya votaste en esta pregunta.",
  PREGUNTA_CERRADA: "La votación ya se cerró.",
  SALA_NO_DISPONIBLE: "Esta sala no existe o ya terminó.",
  CODIGO_NO_EXISTE: "Ese código no es de esta sala.",
  SESION_CON_VOTACION_ABIERTA: "Cierra la votación abierta antes de terminar la sesión.",
  LIMITE_DE_DEMO: `La cuenta de prueba puede tener hasta ${LIMITE_DE_SESIONES_ACTIVAS_DE_DEMO} sesiones activas. Termina una para crear otra.`,
  LIMITE_DE_SESIONES_DE_DEMO: `La cuenta de prueba puede crear hasta ${MAXIMO_DE_SESIONES_DE_DEMO} sesiones al día. Mañana se borran y podrás crear más.`,
  LIMITE_DE_PREGUNTAS_DE_DEMO: `La cuenta de prueba puede tener hasta ${MAXIMO_DE_PREGUNTAS_POR_SESION_DE_DEMO} preguntas por sesión.`,
  SOLO_ADMINISTRADOR: "Solo el administrador de la instalación puede hacer esto.",
  CUERPO_AJENO: "No puedes programar sesiones en ese cuerpo.",
  CUERPO_REPETIDO: "Ya hay un cuerpo con ese nombre.",
  GENERAL_NO_SE_ARCHIVA: "La asamblea general no se puede archivar.",
  HORARIO_INVALIDO:
    "La hora de fin tiene que ser después del inicio, y la sesión puede durar hasta 24 horas.",
  FECHA_INVALIDA: "Revisa la fecha y la hora.",
  LUGAR_INVALIDO: "El lugar puede tener hasta 200 caracteres.",
  NOMBRE_DE_CUERPO_INVALIDO: "El nombre debe tener entre 3 y 120 caracteres, con letras o números.",
  NOMBRE_DE_INSTITUCION_INVALIDO:
    "El nombre de la institución debe tener entre 2 y 120 caracteres.",
  TIPO_DE_CUERPO_INVALIDO: "El nombre del tipo de cuerpo debe tener entre 3 y 40 caracteres.",
  ZONA_HORARIA_INVALIDA: "Esa zona horaria no existe.",
  RANGO_INVALIDO: "El rango de fechas no es válido: puede abarcar hasta 400 días.",
  LIMITE_DE_CODIGOS_DE_DEMO: `La cuenta de prueba puede generar hasta ${CODIGOS_MAXIMOS_POR_SOLICITUD_DE_DEMO} códigos por vez y ${CODIGOS_MAXIMOS_POR_SESION_DE_DEMO} por sesión.`,
};

/**
 * Códigos que se publican con otro nombre. SESION_AJENA sale como SESION_NO_ENCONTRADA, con el
 * mismo cuerpo, para que la cuenta de prueba no distinga una sesión ajena de una inexistente.
 */
const CODIGO_PUBLICO: Readonly<Record<string, string>> = {
  SESION_AJENA: "SESION_NO_ENCONTRADA",
};

/** CIERRE_OCUPADO y CORREO_REPETIDO llevan su propio mensaje, con el detalle del caso. */
const CODIGOS_CON_MENSAJE_DE_DOMINIO: readonly string[] = ["CIERRE_OCUPADO", "CORREO_REPETIDO"];

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
    const codigo = CODIGO_PUBLICO[error.codigo] ?? error.codigo;
    return Response.json(mensaje === undefined ? { error: codigo } : { error: codigo, mensaje }, {
      status: estado,
      headers: {
        "Cache-Control": estado === 404 ? (opciones.cacheEn404 ?? SIN_CACHE) : SIN_CACHE,
      },
    });
  }
  console.error(error);
  return Response.json(
    { error: "ERROR_INTERNO" },
    { status: 500, headers: { "Cache-Control": SIN_CACHE } },
  );
}
