import type { EstadoDeSala } from "@kuorum/contracts";

const ESTADOS_TERMINALES: readonly EstadoDeSala["sala"]["estado"][] = [
  "CERRADA",
  "ACTA_FINAL",
  "CANCELADA",
];

export type VistaDeProyeccion = "terminada" | "esperando" | "votacion" | "resultados" | "palabra";

/**
 * Qué se proyecta. La votación abierta manda; quien tiene la palabra va antes que un
 * resultado viejo (el resultado queda visible hasta la siguiente pregunta); luego el resultado.
 */
export function elegirVista(estado: EstadoDeSala): VistaDeProyeccion {
  const { pregunta, palabra } = estado;
  if (ESTADOS_TERMINALES.includes(estado.sala.estado)) return "terminada";
  if (pregunta?.estado === "ABIERTA") return "votacion";
  if (palabra.conLaPalabra !== null) return "palabra";
  if (pregunta?.resultado) return "resultados";
  return "esperando";
}
