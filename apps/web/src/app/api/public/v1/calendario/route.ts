import {
  CACHE_DEL_CALENDARIO,
  calendarioPublico,
  consultarCalendario,
  rangoAlrededorDeHoy,
} from "@/calendario/consulta-publica";
import { solicitudInvalida } from "@/http/respuestas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function fecha(texto: string | null, porDefecto: Date): Date | undefined {
  if (texto === null) return porDefecto;
  const valor = new Date(texto);
  return Number.isNaN(valor.getTime()) ? undefined : valor;
}

/** `?desde=&hasta=` en ISO; sin ellos, de 30 días atrás a 180 adelante. `?cuerpo=` es el slug. */
export function GET(request: Request): Promise<Response> {
  const parametros = new URL(request.url).searchParams;
  const porDefecto = rangoAlrededorDeHoy(30, 180);
  const desde = fecha(parametros.get("desde"), porDefecto.desde);
  const hasta = fecha(parametros.get("hasta"), porDefecto.hasta);
  if (desde === undefined || hasta === undefined) return Promise.resolve(solicitudInvalida());
  const cuerpo = parametros.get("cuerpo");
  return consultarCalendario(
    { desde, hasta, ...(cuerpo === null ? {} : { cuerpoSlug: cuerpo }) },
    (calendario) =>
      Response.json(calendarioPublico(calendario), {
        headers: { "Cache-Control": CACHE_DEL_CALENDARIO },
      }),
  );
}
