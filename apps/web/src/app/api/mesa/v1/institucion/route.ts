import { puedeProgramarEn } from "@kuorum/application";
import { esquemaInstitucion } from "@kuorum/contracts";
import { contenedor } from "@/composicion";
import { accionDeMesa } from "@/http/accion-de-mesa";
import { leerCuerpo } from "@/http/cuerpo";
import { accion, sinContenido, solicitudInvalida } from "@/http/respuestas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Para cualquier cuenta de la mesa: el formulario de programar necesita los cuerpos. */
export function GET(request: Request): Promise<Response> {
  return accionDeMesa(request, async (actor) => {
    const c = contenedor();
    const [institucion, cuerpos] = await Promise.all([c.institucion.obtener(), c.cuerpos.listar()]);
    return accion({
      institucion: {
        nombre: institucion.nombre,
        tipoDeCuerpoSingular: institucion.tipoDeCuerpoSingular,
        tipoDeCuerpoPlural: institucion.tipoDeCuerpoPlural,
        zonaHoraria: institucion.zonaHoraria,
        logoUrl: institucion.logoUrl,
        colorPrimario: institucion.colorPrimario,
        colorSecundario: institucion.colorSecundario,
        pieDePagina: institucion.pieDePagina,
        textoBienvenida: institucion.textoBienvenida,
        proveedorOAuth: institucion.proveedorOAuth,
        clientIdOAuth: institucion.clientIdOAuth,
        clientSecretOAuth: institucion.clientSecretOAuth,
      },
      cuerpos: cuerpos.map((cuerpo) => ({
        id: cuerpo.id,
        nombre: cuerpo.nombre,
        slug: cuerpo.slug,
        tipo: cuerpo.tipo,
        archivado: cuerpo.archivado,
        puedeProgramar: puedeProgramarEn(actor, cuerpo),
      })),
    });
  });
}

export function PATCH(request: Request): Promise<Response> {
  return accionDeMesa(request, async (actor) => {
    const cambios = await leerCuerpo(request, esquemaInstitucion);
    if (cambios === undefined) return solicitudInvalida();
    const definidos = Object.fromEntries(
      Object.entries(cambios).filter(([, valor]) => valor !== undefined),
    ) as Record<string, string | null>;
    await contenedor().configurarInstitucion.ejecutar(actor, definidos);
    return sinContenido();
  });
}
