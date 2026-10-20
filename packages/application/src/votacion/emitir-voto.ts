import type { RegistroDeVotos } from "@kuorum/domain";
import type { RepositorioDeParticipantes } from "../puertos/repositorio-de-participantes.js";
import type { RepositorioDePreguntas } from "../puertos/repositorio-de-preguntas.js";
import { exigirParticipanteDeLaSesion } from "../sala/exigir-participante-de-la-sesion.js";
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
    await exigirParticipanteDeLaSesion(this.participantes, participanteId, pregunta.sesionId);
    pregunta.exigirAbierta();
    pregunta.exigirOpcion(opcionId);
    await this.votos.emitir(preguntaId, participanteId, opcionId);
  }
}
