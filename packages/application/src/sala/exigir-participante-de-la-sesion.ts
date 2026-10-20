import { ErrorDeDominio } from "@kuorum/domain";
import type { RepositorioDeParticipantes } from "../puertos/repositorio-de-participantes.js";

export async function exigirParticipanteDeLaSesion(
  participantes: RepositorioDeParticipantes,
  participanteId: string,
  sesionId: string,
): Promise<void> {
  const participante = await participantes.porId(participanteId);
  if (participante === null || participante.sesionId !== sesionId) {
    throw new ErrorDeDominio("PARTICIPANTE_AJENO");
  }
}
