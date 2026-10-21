import type { Pregunta } from "@kuorum/domain";
import type { RepositorioDePreguntas } from "../../src/puertos/repositorio-de-preguntas.js";

export class RepositorioDePreguntasEnMemoria implements RepositorioDePreguntas {
  readonly preguntas = new Map<string, Pregunta>();

  async porId(id: string): Promise<Pregunta | null> {
    return this.preguntas.get(id) ?? null;
  }

  async deSesion(sesionId: string): Promise<Pregunta[]> {
    return [...this.preguntas.values()].filter((p) => p.sesionId === sesionId);
  }

  async abiertaDeSesion(sesionId: string): Promise<Pregunta | null> {
    const todas = await this.deSesion(sesionId);
    return todas.find((p) => p.estado === "ABIERTA") ?? null;
  }

  async guardar(pregunta: Pregunta): Promise<void> {
    this.preguntas.set(pregunta.id, pregunta);
  }
}
