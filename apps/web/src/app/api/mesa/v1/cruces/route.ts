import { contenedor } from "@/composicion";
import { accionDeMesa } from "@/http/accion-de-mesa";
import { accion, solicitudInvalida } from "@/http/respuestas";
import { horaLocal } from "@/http/vista-de-sesion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HORA_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** Sesiones que chocan con el tramo que se está programando. Solo avisa. */
export function GET(request: Request): Promise<Response> {
  return accionDeMesa(request, async (actor) => {
    const parametros = new URL(request.url).searchParams;
    const inicio = parametros.get("inicio") ?? "";
    const fin = parametros.get("fin") ?? "";
    if (!HORA_LOCAL.test(inicio) || !HORA_LOCAL.test(fin)) return solicitudInvalida();
    const excluir = parametros.get("excluir");
    const c = contenedor();
    const [cruces, institucion] = await Promise.all([
      c.buscarCruces.ejecutar(actor, {
        inicioLocal: inicio,
        finLocal: fin,
        ...(excluir === null ? {} : { excluirId: excluir }),
      }),
      c.institucion.obtener(),
    ]);
    const zona = institucion.zonaHoraria;
    return accion({
      cruces: cruces.map((s) => ({
        id: s.id,
        titulo: s.titulo,
        cuerpo: s.cuerpo.nombre,
        inicioLocal: horaLocal(s.inicio, zona),
        finLocal: horaLocal(s.fin, zona),
      })),
    });
  });
}
