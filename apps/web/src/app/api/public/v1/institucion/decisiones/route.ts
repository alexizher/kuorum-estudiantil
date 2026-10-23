import { contenedor } from "@/composicion";
import { solicitudInvalida } from "@/http/respuestas";
import { consultaDeLaPeticion, responderJson } from "@/publico/consulta";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** `?desde=&hasta=` en ISO; sin ellos, de 365 días atrás a mañana. */
export function GET(request: Request): Promise<Response> {
  const consulta = consultaDeLaPeticion(request);
  if (consulta === undefined) return Promise.resolve(solicitudInvalida());
  return responderJson(async () => {
    const c = contenedor();
    const decisionesPorCuerpo = await c.listarDecisionesDeLaInstitucion.ejecutar(consulta);
    return {
      cuerpos: decisionesPorCuerpo.map((d) => ({
        id: d.cuerpoId,
        nombre: d.cuerpoNombre,
        slug: d.cuerpoSlug,
        tipo: d.cuerpoTipo,
        decisiones: d.decisiones.map((dec) => ({
          id: dec.id,
          pregunta: dec.pregunta,
          enunciado: dec.enunciado,
          aprobada: dec.aprobada,
          indicativa: dec.indicativa,
          regla: dec.regla,
          resultado: dec.resultado,
          cerradaEn: dec.cerradaEn.toISOString(),
        })),
      })),
    };
  });
}