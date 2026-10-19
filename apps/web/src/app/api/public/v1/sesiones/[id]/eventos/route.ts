import { contenedor } from "../../../../../../../composicion";
import { aEstadoPublico } from "../../../../../../../http/estado-publico";
import { respuestaDeError } from "../../../../../../../http/respuesta-de-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const INTERVALO_DE_CONSULTA_MS = 1000;
// Cierra antes del límite de la función para que el cliente reconecte limpio.
const DURACION_DE_CONEXION_MS = 290_000;
const ESPERA_DE_RECONEXION_MS = 3000;
const INTERVALO_DE_PING_MS = 20_000;

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
        const inicio = Date.now();
        let ultimoEnvio = inicio;
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
        const enviar = (texto: string) => {
          ultimoEnvio = Date.now();
          controlador.enqueue(codificador.encode(texto));
        };
        const emitir = (instantanea: typeof inicial, prefijo = "") => {
          if (instantanea.version === versionEmitida) return false;
          versionEmitida = instantanea.version;
          const datos = JSON.stringify(aEstadoPublico(instantanea));
          enviar(`${prefijo}event: estado\ndata: ${datos}\n\n`);
          return true;
        };
        const ciclo = () => {
          temporizador = setTimeout(async () => {
            if (cerrado) return;
            try {
              const instantanea = await consulta.ejecutar(id);
              if (cerrado) return;
              if (!emitir(instantanea) && Date.now() - ultimoEnvio >= INTERVALO_DE_PING_MS) {
                enviar(": ping\n\n");
              }
            } catch (error) {
              console.error(error);
              terminar();
              return;
            }
            if (Date.now() - inicio >= DURACION_DE_CONEXION_MS) terminar();
            else ciclo();
          }, INTERVALO_DE_CONSULTA_MS);
        };

        if (request.signal.aborted) {
          terminar();
          return;
        }
        request.signal.addEventListener("abort", terminar);
        emitir(inicial, `retry: ${ESPERA_DE_RECONEXION_MS}\n`);
        ciclo();
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
