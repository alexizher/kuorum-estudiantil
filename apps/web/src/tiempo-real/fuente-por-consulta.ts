import { esquemaEstadoPublicoDeSesion, type EstadoPublicoDeSesion } from "@kuorum/contracts";
import {
  temporizadorPorDefecto,
  urlDeEstado,
  type FuenteDeEstado,
  type Temporizador,
} from "./fuente-de-estado";

export class FuenteDeEstadoPorConsulta implements FuenteDeEstado {
  constructor(
    private readonly fetch: typeof globalThis.fetch,
    private readonly intervaloMs: number,
    private readonly temporizador: Temporizador = temporizadorPorDefecto,
    private readonly alFallar?: (error: unknown) => void,
  ) {}

  suscribir(sesionId: string, alCambiar: (estado: EstadoPublicoDeSesion) => void): () => void {
    let activa = true;
    let etiqueta: string | undefined;
    let cancelarEspera: (() => void) | undefined;

    const consultar = async () => {
      if (!activa) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        esperar();
        return;
      }
      try {
        const cabeceras: Record<string, string> = {};
        if (etiqueta !== undefined) cabeceras["If-None-Match"] = etiqueta;
        // Llamada suelta: window.fetch lanza "Illegal invocation" si `this` es la instancia.
        const pedir = this.fetch;
        const respuesta = await pedir(urlDeEstado(sesionId), { headers: cabeceras });
        if (activa && respuesta.status !== 200 && respuesta.status !== 304) {
          throw new Error(`Respuesta ${respuesta.status} al consultar el estado`);
        }
        if (activa && respuesta.status === 200) {
          const analizado = esquemaEstadoPublicoDeSesion.safeParse(await respuesta.json());
          if (activa && !analizado.success) {
            throw new Error("El estado recibido no cumple el contrato", { cause: analizado.error });
          }
          if (activa && analizado.success) {
            etiqueta = respuesta.headers.get("ETag") ?? undefined;
            alCambiar(analizado.data);
          }
        }
      } catch (error) {
        // se reintenta en el siguiente turno; quien llama decide si registrarlo
        if (activa) this.alFallar?.(error);
      }
      esperar();
    };
    const esperar = () => {
      if (activa)
        cancelarEspera = this.temporizador.programar(() => void consultar(), this.intervaloMs);
    };

    void consultar();
    return () => {
      activa = false;
      cancelarEspera?.();
    };
  }
}
