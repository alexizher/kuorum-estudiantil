import { esquemaEstadoDeSala, type EstadoDeSala } from "@kuorum/contracts";
import {
  temporizadorPorDefecto,
  urlDeEstado,
  type FuenteDeEstado,
  type Temporizador,
} from "./fuente-de-estado";
import {
  CONTEXTO_EN_REPOSO,
  type ContextoDeIntervalo,
  type PoliticaDeIntervalo,
} from "./intervalo-adaptativo";

export class FuenteDeEstadoPorConsulta implements FuenteDeEstado {
  private readonly reprogramadores = new Set<() => void>();

  constructor(
    private readonly fetch: typeof globalThis.fetch,
    private readonly politica: PoliticaDeIntervalo,
    private readonly temporizador: Temporizador = temporizadorPorDefecto,
    private readonly alFallar?: (error: unknown) => void,
    private readonly contexto: () => ContextoDeIntervalo = () => CONTEXTO_EN_REPOSO,
  ) {}

  suscribir(
    codigo: string,
    alCambiar: (estado: EstadoDeSala) => void,
    alNoExistir?: () => void,
    alIntentar?: (conExito: boolean) => void,
  ): () => void {
    let activa = true;
    let etiqueta: string | undefined;
    let cancelarEspera: (() => void) | undefined;
    let consultando = false;

    const consultar = async () => {
      if (!activa) return;
      consultando = true;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        consultando = false;
        esperar();
        return;
      }
      try {
        const cabeceras: Record<string, string> = {};
        if (etiqueta !== undefined) cabeceras["If-None-Match"] = etiqueta;
        // Llamada suelta: window.fetch lanza "Illegal invocation" si `this` es la instancia.
        const pedir = this.fetch;
        const respuesta = await pedir(urlDeEstado(codigo), { headers: cabeceras });
        if (activa && respuesta.status === 404) {
          activa = false;
          alNoExistir?.();
          return;
        }
        if (activa && respuesta.status !== 200 && respuesta.status !== 304) {
          throw new Error(`Respuesta ${respuesta.status} al consultar el estado`);
        }
        if (activa && respuesta.status === 200) {
          const analizado = esquemaEstadoDeSala.safeParse(await respuesta.json());
          if (activa && !analizado.success) {
            throw new Error("El estado recibido no cumple el contrato", { cause: analizado.error });
          }
          if (activa && analizado.success) {
            etiqueta = respuesta.headers.get("ETag") ?? undefined;
            alCambiar(analizado.data);
          }
        }
        if (activa) alIntentar?.(true);
      } catch (error) {
        // se reintenta en el siguiente turno; quien llama decide si registrarlo
        if (activa) {
          this.alFallar?.(error);
          alIntentar?.(false);
        }
      }
      consultando = false;
      esperar();
    };
    const esperar = () => {
      if (activa)
        cancelarEspera = this.temporizador.programar(
          () => void consultar(),
          this.politica.intervaloMs(this.contexto()),
        );
    };

    // El contexto cambió: la espera ya programada usó el de antes.
    const reprogramar = () => {
      if (!activa || consultando || cancelarEspera === undefined) return;
      cancelarEspera();
      esperar();
    };
    this.reprogramadores.add(reprogramar);

    void consultar();
    return () => {
      activa = false;
      cancelarEspera?.();
      this.reprogramadores.delete(reprogramar);
    };
  }

  /** Vuelve a programar la próxima consulta con el contexto de ahora. */
  reprogramar(): void {
    for (const reprogramar of this.reprogramadores) reprogramar();
  }
}
