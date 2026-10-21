import type { EstadoDeSala } from "@kuorum/contracts";

export interface FuenteDeEstado {
  /** Devuelve la función que cancela la suscripción. */
  suscribir(
    codigo: string,
    alCambiar: (estado: EstadoDeSala) => void,
    /** La sala no existe (404). La fuente deja de consultar. */
    alNoExistir?: () => void,
    /** Resultado de cada intento de consulta: true con 200 o 304, false con un error. */
    alIntentar?: (conExito: boolean) => void,
  ): () => void;
}

/** Fuente que además puede consultar de inmediato. */
export interface FuenteRefrescable extends FuenteDeEstado {
  refrescar(): void;
}

export interface Temporizador {
  /** Devuelve la función que cancela la acción programada. */
  programar(accion: () => void, ms: number): () => void;
}

export const temporizadorPorDefecto: Temporizador = {
  programar(accion, ms) {
    const id = setTimeout(accion, ms);
    return () => clearTimeout(id);
  },
};

export function urlDeEstado(codigo: string): string {
  return `/api/public/v1/salas/${encodeURIComponent(codigo)}/estado`;
}
