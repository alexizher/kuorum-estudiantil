import { contenedor } from "@/composicion";
import { responderJson } from "@/publico/consulta";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(): Promise<Response> {
  return responderJson(async () => {
    const c = contenedor();
    const institucion = await c.institucion.obtener();
    return {
      nombre: institucion.nombre,
      logoUrl: institucion.logoUrl,
      colorPrimario: institucion.colorPrimario,
      colorSecundario: institucion.colorSecundario,
      pieDePagina: institucion.pieDePagina,
      textoBienvenida: institucion.textoBienvenida,
    };
  });
}