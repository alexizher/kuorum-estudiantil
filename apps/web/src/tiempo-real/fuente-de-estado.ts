import type { EstadoPublicoDeSesion } from "@kuorum/contracts";

export interface FuenteDeEstado {
  /** Devuelve la función que cancela la suscripción. */
  suscribir(sesionId: string, alCambiar: (estado: EstadoPublicoDeSesion) => void): () => void;
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

export function urlDeEstado(sesionId: string): string {
  return `/api/public/v1/sesiones/${encodeURIComponent(sesionId)}/estado`;
}

export function urlDeEventos(sesionId: string): string {
  return `/api/public/v1/sesiones/${encodeURIComponent(sesionId)}/eventos`;
}
