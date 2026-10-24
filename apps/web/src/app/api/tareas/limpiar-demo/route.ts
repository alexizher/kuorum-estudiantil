import { contenedor } from "@/composicion";
import { esTareaAutorizada } from "@/http/autorizacion-de-tareas";
import { respuestaDeError } from "@/http/respuesta-de-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SIN_CACHE = { "Cache-Control": "no-store" };

/** Tarea diaria de Vercel Cron: borra las sesiones de la cuenta de prueba y todo lo suyo. */
export async function GET(solicitud: Request): Promise<Response> {
  if (!esTareaAutorizada(solicitud, process.env.CRON_SECRET)) {
    return Response.json({ error: "NO_AUTORIZADO" }, { status: 401, headers: SIN_CACHE });
  }
  try {
    const eliminadas = await contenedor().limpiarSesionesDeDemo.ejecutar();
    return Response.json({ eliminadas }, { headers: SIN_CACHE });
  } catch (error) {
    return respuestaDeError(error);
  }
}
