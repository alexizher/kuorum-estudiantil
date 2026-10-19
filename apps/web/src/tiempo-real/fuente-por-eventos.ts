import { esquemaEstadoPublicoDeSesion, type EstadoPublicoDeSesion } from "@kuorum/contracts";
import { urlDeEventos, type FuenteDeEstado } from "./fuente-de-estado";

const EVENT_SOURCE_CERRADO = 2;

export class FuenteDeEstadoPorEventos implements FuenteDeEstado {
  constructor(private readonly crearEventSource: (url: string) => EventSource) {}

  suscribir(sesionId: string, alCambiar: (estado: EstadoPublicoDeSesion) => void): () => void {
    let activa = true;
    let conexion: EventSource | undefined;

    const conectar = () => {
      const actual = this.crearEventSource(urlDeEventos(sesionId));
      conexion = actual;
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
      // Mientras readyState sea CONNECTING el navegador reintenta solo.
      actual.onerror = () => {
        if (!activa || actual.readyState !== EVENT_SOURCE_CERRADO) return;
        actual.close();
        conectar();
      };
    };

    conectar();
    return () => {
      activa = false;
      conexion?.close();
    };
  }
}
