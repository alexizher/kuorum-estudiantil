import { esquemaEstadoPublicoDeSesion, type EstadoPublicoDeSesion } from "@kuorum/contracts";
import {
  temporizadorPorDefecto,
  urlDeEventos,
  type FuenteDeEstado,
  type Temporizador,
} from "./fuente-de-estado";

const EVENT_SOURCE_CERRADO = 2;
export const ESPERA_MINIMA_MS = 1000;
export const ESPERA_MAXIMA_MS = 30_000;

export class FuenteDeEstadoPorEventos implements FuenteDeEstado {
  constructor(
    private readonly crearEventSource: (url: string) => EventSource,
    private readonly temporizador: Temporizador = temporizadorPorDefecto,
  ) {}

  suscribir(sesionId: string, alCambiar: (estado: EstadoPublicoDeSesion) => void): () => void {
    let activa = true;
    let conexion: EventSource | undefined;
    let cancelarEspera: (() => void) | undefined;
    let fallos = 0;

    const conectar = () => {
      const actual = this.crearEventSource(urlDeEventos(sesionId));
      conexion = actual;
      actual.addEventListener("open", () => {
        fallos = 0;
      });
      actual.addEventListener("estado", (evento) => {
        if (!activa) return;
        try {
          const analizado = esquemaEstadoPublicoDeSesion.safeParse(
            JSON.parse((evento as MessageEvent<string>).data),
          );
          if (analizado.success) alCambiar(analizado.data);
        } catch {
          // dato que no es JSON: se descarta
        }
      });
      // Mientras readyState sea CONNECTING el navegador reintenta solo. CLOSED
      // (por ejemplo un 404 o 500) no se reintenta: se reconecta con espera creciente.
      actual.onerror = () => {
        if (!activa || actual.readyState !== EVENT_SOURCE_CERRADO) return;
        actual.close();
        const espera = Math.min(ESPERA_MAXIMA_MS, ESPERA_MINIMA_MS * 2 ** fallos);
        fallos++;
        cancelarEspera = this.temporizador.programar(() => {
          if (activa) conectar();
        }, espera);
      };
    };

    conectar();
    return () => {
      activa = false;
      cancelarEspera?.();
      conexion?.close();
    };
  }
}
