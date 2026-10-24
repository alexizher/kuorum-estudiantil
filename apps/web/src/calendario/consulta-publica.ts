import type { Calendario } from "@kuorum/application";
import { contenedor } from "@/composicion";
import { respuestaDeError } from "@/http/respuesta-de-error";

const DIA_MS = 86_400_000;

/** Público y cacheado en el borde: el calendario cambia poco y lo pueden pedir miles. */
export const CACHE_DEL_CALENDARIO = "public, max-age=0, s-maxage=60, stale-while-revalidate=300";

export function rangoAlrededorDeHoy(atras: number, adelante: number): { desde: Date; hasta: Date } {
  const ahora = Date.now();
  return { desde: new Date(ahora - atras * DIA_MS), hasta: new Date(ahora + adelante * DIA_MS) };
}

/** Con acta final hay acta pública: su id es el de la sesión. */
export function actaIdDeSesion(s: { id: string; estado: string }): string | null {
  return s.estado === "ACTA_FINAL" ? s.id : null;
}

/** El JSON público: sin ids internos de cuerpos ni código de sala. */
export function calendarioPublico({ institucion, cuerpos, sesiones }: Calendario) {
  return {
    institucion: {
      nombre: institucion.nombre,
      tipoDeCuerpoSingular: institucion.tipoDeCuerpoSingular,
      tipoDeCuerpoPlural: institucion.tipoDeCuerpoPlural,
      zonaHoraria: institucion.zonaHoraria,
    },
    cuerpos: cuerpos.map((c) => ({
      slug: c.slug,
      nombre: c.nombre,
      tipo: c.tipo,
      archivado: c.archivado,
    })),
    sesiones: sesiones.map((s) => ({
      id: s.id,
      titulo: s.titulo,
      cuerpo: { slug: s.cuerpo.slug, nombre: s.cuerpo.nombre },
      inicio: s.inicio.toISOString(),
      fin: s.fin.toISOString(),
      modalidad: s.modalidad,
      lugar: s.lugar,
      estado: s.estado,
      actaId: actaIdDeSesion(s),
    })),
  };
}

/** Lee el calendario y traduce los errores; el 404 también se cachea un poco. */
export async function consultarCalendario(
  consulta: { desde: Date; hasta: Date; cuerpoSlug?: string },
  responder: (calendario: Calendario) => Response,
): Promise<Response> {
  try {
    return responder(await contenedor().listarCalendario.ejecutar(consulta));
  } catch (error) {
    return respuestaDeError(error, { cacheEn404: CACHE_DEL_CALENDARIO });
  }
}
