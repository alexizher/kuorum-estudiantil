import { ErrorDeDominio, type RegistroDeVotos } from "@kuorum/domain";
import type { RepositorioDeParticipantes } from "../puertos/repositorio-de-participantes.js";
import type { RepositorioDePreguntas } from "../puertos/repositorio-de-preguntas.js";
import { obtenerPregunta } from "./obtener-pregunta.js";

/** No sube la versión de la sesión: el conteo de votos emitidos tiene su propio contador. */
export class EmitirVoto {
  constructor(
    private readonly participantes: RepositorioDeParticipantes,
    private readonly preguntas: RepositorioDePreguntas,
    private readonly votos: RegistroDeVotos,
  ) {}

  async ejecutar(participanteId: string, preguntaId: string, opcionId: string): Promise<void> {
    const pregunta = await obtenerPregunta(this.preguntas, preguntaId);
    const participante = await this.participantes.porId(participanteId);
    if (participante === null || participante.sesionId !== pregunta.sesionId) {
      throw new ErrorDeDominio("PARTICIPANTE_AJENO");
    }
    pregunta.exigirAbierta();
    pregunta.exigirOpcion(opcionId);
    await this.votos.emitir(preguntaId, participanteId, opcionId);
  }
}
