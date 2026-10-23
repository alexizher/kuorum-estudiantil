import { contenedor } from "../../../../../composicion";
import { solicitudInvalida } from "../../../../../http/respuestas";
import { consultaDeLaPeticion, responderJson } from "../../../../../publico/consulta";

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
      if (!acta.codigo || !acta.finalizadaEn || !cuerpo) continue;
      actas.push({
        id: sesion.id,
        cuerpo: { slug: cuerpo.slug, nombre: cuerpo.nombre },
        titulo: sesion.titulo,
        inicio: sesion.inicio.toISOString(),
        finalizadaEn: acta.finalizadaEn.toISOString(),
        codigo: acta.codigo.valor,
        pdf: `/api/public/v1/actas/${sesion.id}.pdf`,
      });
    }
    return { actas };
  });
}
