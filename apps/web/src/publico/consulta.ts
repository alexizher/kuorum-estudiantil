import type { ConsultaPublica } from "@kuorum/application";
import { CACHE_DEL_CALENDARIO, rangoAlrededorDeHoy } from "../calendario/consulta-publica";
import { respuestaDeError } from "../http/respuesta-de-error";

export { CACHE_DEL_CALENDARIO };

/** El PDF es inmutable: se cachea un día en el borde. */
export const CACHE_DEL_PDF = "public, max-age=0, s-maxage=86400";

function fecha(texto: string | null, porDefecto: Date): Date | undefined {
  if (texto === null) return porDefecto;
  const valor = new Date(texto);
  return Number.isNaN(valor.getTime()) ? undefined : valor;
}

/** `?desde=&hasta=&cuerpo=`; sin fechas, de 365 días atrás a mañana. Undefined si una fecha no se entiende. */
export function consultaDeLaPeticion(request: Request): ConsultaPublica | undefined {
  const parametros = new URL(request.url).searchParams;
  const porDefecto = rangoAlrededorDeHoy(365, 1);
  const desde = fecha(parametros.get("desde"), porDefecto.desde);
  const hasta = fecha(parametros.get("hasta"), porDefecto.hasta);
  if (desde === undefined || hasta === undefined) return undefined;
  const cuerpo = parametros.get("cuerpo");
  return { desde, hasta, ...(cuerpo === null ? {} : { cuerpoSlug: cuerpo }) };
}

export async function responderJson(consulta: () => Promise<unknown>): Promise<Response> {
  try {
    return Response.json(await consulta(), { headers: { "Cache-Control": CACHE_DEL_CALENDARIO } });
  } catch (error) {
    return respuestaDeError(error, { cacheEn404: CACHE_DEL_CALENDARIO });
  }
}
