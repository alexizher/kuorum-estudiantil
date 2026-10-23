import { esquemaCrearSesion } from "@kuorum/contracts";
import { contenedor } from "../../../../../composicion";
import { accionDeMesa } from "../../../../../http/accion-de-mesa";
import { leerCuerpo } from "../../../../../http/cuerpo";
import { accion, solicitudInvalida } from "../../../../../http/respuestas";
import { vistaDeSesion } from "../../../../../http/vista-de-sesion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request): Promise<Response> {
  return accionDeMesa(request, async (actor) => {
    // Solo SUPERADMIN consigue algo con esto: el caso de uso lo ignora para los demás roles.
    const incluirCuentaDePrueba = new URL(request.url).searchParams.get("incluirPrueba") === "1";
    const c = contenedor();
    const [sesiones, cuerpos, institucion] = await Promise.all([
      c.listarSesionesDeLaMesa.ejecutar(actor, { incluirCuentaDePrueba }),
      c.cuerpos.listar(),
      c.institucion.obtener(),
    ]);
    return accion({
      sesiones: sesiones.map((s) => vistaDeSesion(s, cuerpos, institucion.zonaHoraria, actor)),
    });
  });
}

export function POST(request: Request): Promise<Response> {
  return accionDeMesa(request, async (actor) => {
    const cuerpo = await leerCuerpo(request, esquemaCrearSesion);
    if (cuerpo === undefined) return solicitudInvalida();
    const c = contenedor();
    const sesion = await c.crearSesion.ejecutar(actor, {
      titulo: cuerpo.titulo,
      modo: cuerpo.modo,
      ...(cuerpo.segundosPorIntervencion === undefined
        ? {}
        : { segundosPorIntervencion: cuerpo.segundosPorIntervencion }),
      cuerpoId: cuerpo.cuerpoId,
      inicioLocal: cuerpo.inicio,
      finLocal: cuerpo.fin,
      modalidad: cuerpo.modalidad,
      ...(cuerpo.lugar === undefined ? {} : { lugar: cuerpo.lugar }),
      ...(cuerpo.ordenDelDia === undefined ? {} : { ordenDelDia: cuerpo.ordenDelDia }),
    });
    const [cuerpos, institucion] = await Promise.all([c.cuerpos.listar(), c.institucion.obtener()]);
    return accion(vistaDeSesion(sesion, cuerpos, institucion.zonaHoraria, actor), 201);
  });
}
