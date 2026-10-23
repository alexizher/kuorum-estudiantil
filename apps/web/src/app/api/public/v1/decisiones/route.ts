import { contenedor } from "../../../../../composicion";
import { solicitudInvalida } from "../../../../../http/respuestas";
import { consultaDeLaPeticion, responderJson } from "../../../../../publico/consulta";
import type { Decision } from "@kuorum/domain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** `?desde=&hasta=` en ISO; sin ellos, de 365 días atrás a mañana. `?cuerpo=` es el slug. */
export function GET(request: Request): Promise<Response> {
  const consulta = consultaDeLaPeticion(request);
  if (consulta === undefined) return Promise.resolve(solicitudInvalida());
  return responderJson(async () => {
    const c = contenedor();
    const decisiones = await c.listarDecisionesPublicas.ejecutar(consulta);
    const cuerpos = new Map<string, { slug: string; nombre: string }>();
    const sesiones = new Map<string, { id: string; titulo: string }>();
    for (const d of decisiones) {
      if (!cuerpos.has(d.cuerpoId)) {
        const cuerpo = await c.cuerpos.porId(d.cuerpoId);
        if (cuerpo) cuerpos.set(d.cuerpoId, { slug: cuerpo.slug, nombre: cuerpo.nombre });
      }
      if (!sesiones.has(d.sesionId)) {
        const sesion = await c.sesiones.porId(d.sesionId);
        if (sesion) sesiones.set(d.sesionId, { id: sesion.id, titulo: sesion.titulo });
      }
    }
    return {
      decisiones: decisiones.map((d: Decision) => ({
        id: d.id,
        cuerpo: cuerpos.get(d.cuerpoId) ?? null,
        sesion: sesiones.get(d.sesionId) ?? null,
        pregunta: d.pregunta,
        enunciado: d.enunciado,
        aprobada: d.aprobada,
        indicativa: d.indicativa,
        regla: d.regla,
        resultado: d.resultado,
        cerradaEn: d.cerradaEn.toISOString(),
      })),
    };
  });
}
