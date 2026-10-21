import { OPCIONES_SI_NO_ABSTENCION } from "@kuorum/domain";
import { esquemaCrearPregunta } from "@kuorum/contracts";
import { contenedor } from "../../../../../../../composicion";
import { accionDeMesa } from "../../../../../../../http/accion-de-mesa";
import { leerCuerpo } from "../../../../../../../http/cuerpo";
import { accion, solicitudInvalida } from "../../../../../../../http/respuestas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  contexto: { params: Promise<{ id: string }> },
): Promise<Response> {
  return accionDeMesa(request, async () => {
    const { id } = await contexto.params;
    const preguntas = await contenedor().listarPreguntasDeSesion.ejecutar(id);
    return accion({
      preguntas: preguntas.map((p) => ({
        id: p.id,
        texto: p.texto,
        estado: p.estado,
        resultadoProyectado: p.resultadoVisible,
        opciones: p.opciones.map((o) => ({ id: o.id, texto: o.texto })),
      })),
    });
  });
}

export async function POST(
  request: Request,
  contexto: { params: Promise<{ id: string }> },
): Promise<Response> {
  return accionDeMesa(request, async () => {
    const cuerpo = await leerCuerpo(request, esquemaCrearPregunta);
    if (cuerpo === undefined) return solicitudInvalida();
    const { id } = await contexto.params;
    const pregunta = await contenedor().crearPregunta.ejecutar(
      id,
      cuerpo.texto,
      cuerpo.opciones ?? OPCIONES_SI_NO_ABSTENCION,
    );
    return accion(
      {
        id: pregunta.id,
        texto: pregunta.texto,
        estado: pregunta.estado,
        opciones: pregunta.opciones.map((o) => ({ id: o.id, texto: o.texto })),
      },
      201,
    );
  });
}
