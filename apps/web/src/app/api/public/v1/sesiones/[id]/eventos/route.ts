import { contenedor } from "../../../../../../../composicion";
import { aEstadoPublico } from "../../../../../../../http/estado-publico";
import { respuestaDeError } from "../../../../../../../http/respuesta-de-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const INTERVALO_DE_CONSULTA_MS = 1000;
// Cierra antes del límite de la función para que el cliente reconecte limpio.
const DURACION_DE_CONEXION_MS = 290_000;

const CABECERAS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

export async function GET(
  request: Request,
  contexto: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await contexto.params;
    const consulta = contenedor().consultarEstadoDeSesion;
    const inicial = await consulta.ejecutar(id);
    const codificador = new TextEncoder();
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    let terminar = () => {};

    const cuerpo = new ReadableStream<Uint8Array>({
      start(controlador) {
        let versionEmitida = -1;
        let cerrado = false;
        terminar = () => {
          if (cerrado) return;
          cerrado = true;
          clearTimeout(temporizador);
          request.signal.removeEventListener("abort", terminar);
          try {
            controlador.close();
          } catch {
            // el flujo ya estaba cancelado por el cliente
          }
        };
        const emitir = (instantanea: typeof inicial) => {
          if (instantanea.version === versionEmitida) return;
          versionEmitida = instantanea.version;
          const datos = JSON.stringify(aEstadoPublico(instantanea));
          controlador.enqueue(codificador.encode(`event: estado\ndata: ${datos}\n\n`));
        };
        const ciclo = (transcurridoMs: number) => {
          temporizador = setTimeout(async () => {
            if (cerrado) return;
            const total = transcurridoMs + INTERVALO_DE_CONSULTA_MS;
            try {
              emitir(await consulta.ejecutar(id));
            } catch (error) {
              console.error(error);
              terminar();
              return;
            }
            if (cerrado) return;
            if (total >= DURACION_DE_CONEXION_MS) terminar();
            else ciclo(total);
          }, INTERVALO_DE_CONSULTA_MS);
        };

        if (request.signal.aborted) {
          terminar();
          return;
        }
        request.signal.addEventListener("abort", terminar);
        emitir(inicial);
        ciclo(0);
      },
      cancel() {
        terminar();
      },
    });

    return new Response(cuerpo, { headers: CABECERAS });
  } catch (error) {
    return respuestaDeError(error);
  }
}
