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
        const respuesta = await this.fetch(urlDeEstado(sesionId), { headers: cabeceras });
        if (activa && respuesta.status === 200) {
          const analizado = esquemaEstadoPublicoDeSesion.safeParse(await respuesta.json());
          if (activa && analizado.success) {
            etiqueta = respuesta.headers.get("ETag") ?? undefined;
            alCambiar(analizado.data);
          }
        }
      } catch {
        // error de red o cuerpo ilegible: se reintenta en el siguiente turno
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
