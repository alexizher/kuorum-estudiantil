import { esquemaGenerarCodigos } from "@kuorum/contracts";
import { contenedor } from "../../../../../../../composicion";
import { accionDeMesa } from "../../../../../../../http/accion-de-mesa";
import { leerCuerpo } from "../../../../../../../http/cuerpo";
import { accion, solicitudInvalida } from "../../../../../../../http/respuestas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Devuelve el texto plano de los códigos una sola vez; en la base solo queda el hash. */
export async function POST(
  request: Request,
  contexto: { params: Promise<{ id: string }> },
): Promise<Response> {
  return accionDeMesa(request, async () => {
    const cuerpo = await leerCuerpo(request, esquemaGenerarCodigos);
    if (cuerpo === undefined) return solicitudInvalida();
    const { id } = await contexto.params;
    const codigos = await contenedor().generarCodigosDeAcceso.ejecutar(id, cuerpo.cantidad);
    return accion({ codigos });
  });
}
