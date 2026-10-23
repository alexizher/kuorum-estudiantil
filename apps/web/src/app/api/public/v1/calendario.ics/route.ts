import { generarIcs } from "../../../../../calendario/ics";
import {
  CACHE_DEL_CALENDARIO,
  consultarCalendario,
  rangoAlrededorDeHoy,
} from "../../../../../calendario/consulta-publica";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Para suscribirse desde Google Calendar u Outlook. `?cuerpo=` es el slug. Un mes atrás y un año
 * adelante: cabe en DIAS_MAXIMOS_DEL_CALENDARIO.
 */
export function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const cuerpo = url.searchParams.get("cuerpo");
  return consultarCalendario(
    { ...rangoAlrededorDeHoy(30, 365), ...(cuerpo === null ? {} : { cuerpoSlug: cuerpo }) },
    ({ institucion, cuerpos, sesiones }) => {
      const filtrado = cuerpos.find((c) => c.slug === cuerpo)?.nombre;
      const texto = generarIcs({
        institucion: institucion.nombre,
        ...(filtrado === undefined ? {} : { cuerpo: filtrado }),
        host: url.host,
        generadoEn: new Date(),
        sesiones,
      });
      return new Response(texto, {
        headers: {
          "Content-Type": "text/calendar; charset=utf-8",
          "Content-Disposition": 'inline; filename="calendario.ics"',
          "Cache-Control": CACHE_DEL_CALENDARIO,
        },
      });
    },
  );
}
