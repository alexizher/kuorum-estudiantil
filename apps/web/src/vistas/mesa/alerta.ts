import type { EstadoDeSala } from "@kuorum/contracts";

export const TEXTO_DE_ALERTA_DE_VOTOS = "Hay más votos que códigos activados";

/**
 * Con códigos, cada voto sale de un código ya activado. Si hay más votos que
 * asistentes, algo falla: la mesa debe verlo en el momento.
 */
export function hayMasVotosQueCodigos(estado: EstadoDeSala | null): boolean {
  if (estado === null || estado.pregunta === null || estado.asistencia === null) return false;
  return estado.pregunta.votosEmitidos > estado.asistencia;
}
