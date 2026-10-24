import { generarPdfDelActa } from "@/actas/pdf-del-acta";
import { contenedor } from "@/composicion";
import { respuestaDeError } from "@/http/respuesta-de-error";
import { CACHE_DEL_CALENDARIO, CACHE_DEL_PDF } from "@/publico/consulta";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** El id es el de la sesión y puede llevar `.pdf`. Solo hay PDF de actas finales y públicas. */
export async function GET(
  request: Request,
  contexto: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await contexto.params;
  try {
    const { acta } = await contenedor().obtenerActaPublica.ejecutar(id.replace(/\.pdf$/i, ""));
    if (!acta.contenido || !acta.codigo) throw new Error("Acta final sin contenido ni código");
    const codigo = acta.codigo.valor;
    const url = `${new URL(request.url).origin}/actas/verificar?codigo=${encodeURIComponent(codigo)}`;
    const bytes = await generarPdfDelActa(acta.contenido, codigo, url);
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="acta-${codigo}.pdf"`,
        "Cache-Control": CACHE_DEL_PDF,
      },
    });
  } catch (error) {
    return respuestaDeError(error, { cacheEn404: CACHE_DEL_CALENDARIO });
  }
}
