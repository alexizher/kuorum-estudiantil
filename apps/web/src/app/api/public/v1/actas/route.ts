import { contenedor } from "@/composicion";
import { solicitudInvalida } from "@/http/respuestas";
import { consultaDeLaPeticion, responderJson } from "@/publico/consulta";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Mismos parámetros que las decisiones. El id del acta es el de su sesión. */
export function GET(request: Request): Promise<Response> {
  const consulta = consultaDeLaPeticion(request);
  if (consulta === undefined) return Promise.resolve(solicitudInvalida());
  return responderJson(async () => {
    const c = contenedor();
    const publicas = await c.listarActasPublicas.ejecutar(consulta);
    const actas = [];
    for (const { acta, sesion } of publicas) {
      const cuerpo = await c.cuerpos.porId(sesion.cuerpoId);
      if (!acta.codigo || !acta.finalizadaEn || !acta.contenido || !cuerpo) continue;
      actas.push({
        id: sesion.id,
        cuerpo: { slug: cuerpo.slug, nombre: cuerpo.nombre },
        // La foto del acta: lo que se cambie después en la sesión no la altera.
        titulo: acta.contenido.titulo,
        inicio: acta.contenido.inicio,
        finalizadaEn: acta.finalizadaEn.toISOString(),
        codigo: acta.codigo.valor,
        pdf: `/api/public/v1/actas/${sesion.id}.pdf`,
      });
    }
    return { actas };
  });
}
