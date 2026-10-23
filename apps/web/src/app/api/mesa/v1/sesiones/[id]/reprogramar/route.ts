import { esquemaReprogramar } from "@kuorum/contracts";
import { contenedor } from "../../../../../../../composicion";
import { accionDeMesa } from "../../../../../../../http/accion-de-mesa";
import { leerCuerpo } from "../../../../../../../http/cuerpo";
import { sinContenido, solicitudInvalida } from "../../../../../../../http/respuestas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  contexto: { params: Promise<{ id: string }> },
): Promise<Response> {
  return accionDeMesa(request, async (actor) => {
    const { id } = await contexto.params;
    const cuerpo = await leerCuerpo(request, esquemaReprogramar);
    if (cuerpo === undefined) return solicitudInvalida();
    await contenedor().reprogramarSesion.ejecutar(actor, id, {
      ...(cuerpo.titulo === undefined ? {} : { titulo: cuerpo.titulo }),
      ...(cuerpo.inicio === undefined ? {} : { inicioLocal: cuerpo.inicio }),
      ...(cuerpo.fin === undefined ? {} : { finLocal: cuerpo.fin }),
      ...(cuerpo.modalidad === undefined ? {} : { modalidad: cuerpo.modalidad }),
      ...(cuerpo.lugar === undefined ? {} : { lugar: cuerpo.lugar }),
    });
    return sinContenido();
  });
}
