import { esquemaMembresia } from "@kuorum/contracts";
import { contenedor } from "@/composicion";
import { accionDeMesa } from "@/http/accion-de-mesa";
import { leerCuerpo } from "@/http/cuerpo";
import { sinContenido, solicitudInvalida } from "@/http/respuestas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Contexto {
  params: Promise<{ id: string }>;
}

/** Da o cambia el rol de la persona en un cuerpo. */
export async function PUT(request: Request, contexto: Contexto): Promise<Response> {
  return accionDeMesa(request, async (actor) => {
    const { id } = await contexto.params;
    const datos = await leerCuerpo(request, esquemaMembresia);
    if (datos === undefined) return solicitudInvalida();
    await contenedor().asignarMembresia.ejecutar(actor, id, datos.cuerpoId, datos.rol);
    return sinContenido();
  });
}

/** `?cuerpo=<id>`: la saca de ese cuerpo. */
export async function DELETE(request: Request, contexto: Contexto): Promise<Response> {
  return accionDeMesa(request, async (actor) => {
    const { id } = await contexto.params;
    const cuerpoId = new URL(request.url).searchParams.get("cuerpo");
    if (cuerpoId === null || cuerpoId === "") return solicitudInvalida();
    await contenedor().quitarMembresia.ejecutar(actor, id, cuerpoId);
    return sinContenido();
  });
}
