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

export interface OpcionesDeConsulta {
  temporizador?: Temporizador;
  /** Cada fallo de una consulta; la fuente reintenta en el siguiente turno. */
  alFallar?: (error: unknown) => void;
  /** Lo que la política necesita para elegir el intervalo. Por defecto, en reposo. */
  contexto?: () => ContextoDeIntervalo;
}

export class FuenteDeEstadoPorConsulta implements FuenteDeEstado {
  private readonly reprogramadores = new Set<() => void>();
  private readonly refrescadores = new Set<() => void>();
  private readonly temporizador: Temporizador;
  private readonly alFallar: ((error: unknown) => void) | undefined;
  private readonly contexto: () => ContextoDeIntervalo;

  constructor(
    private readonly fetch: typeof globalThis.fetch,
    private readonly politica: PoliticaDeIntervalo,
    opciones: OpcionesDeConsulta = {},
  ) {
    this.temporizador = opciones.temporizador ?? temporizadorPorDefecto;
    this.alFallar = opciones.alFallar;
    this.contexto = opciones.contexto ?? (() => CONTEXTO_EN_REPOSO);
  }

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
    let repetirAlTerminar = false;

    const consultar = async (saltarCache = false) => {
      if (!activa) return;
      consultando = true;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        consultando = false;
        esperar();
        return;
      }
      try {
        const cabeceras: Record<string, string> = {};
        if (etiqueta !== undefined && !saltarCache) cabeceras["If-None-Match"] = etiqueta;
        // Llamada suelta: window.fetch lanza "Illegal invocation" si `this` es la instancia.
        const pedir = this.fetch;
        // Un parámetro distinto hace que la CDN no devuelva la copia de hace dos segundos.
        const url = saltarCache ? `${urlDeEstado(codigo)}?r=${Date.now()}` : urlDeEstado(codigo);
        const respuesta = await pedir(url, { headers: cabeceras });
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
      if (repetirAlTerminar) {
        repetirAlTerminar = false;
        void consultar(true);
      } else {
        esperar();
      }
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

    const refrescar = () => {
      if (!activa) return;
      if (consultando) {
        repetirAlTerminar = true;
        return;
      }
      cancelarEspera?.();
      void consultar(true);
    };
    this.refrescadores.add(refrescar);

    void consultar();
    return () => {
      activa = false;
      cancelarEspera?.();
      this.reprogramadores.delete(reprogramar);
      this.refrescadores.delete(refrescar);
    };
  }

  /** Vuelve a programar la próxima consulta con el contexto de ahora. */
  reprogramar(): void {
    for (const reprogramar of this.reprogramadores) reprogramar();
  }

  /** Consulta ya, sin esperar el turno ni la caché. Para después de una acción de la mesa. */
  refrescar(): void {
    for (const refrescar of this.refrescadores) refrescar();
  }
}
