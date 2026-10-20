import type { Pregunta } from "@kuorum/domain";

export interface RepositorioDePreguntas {
  porId(id: string): Promise<Pregunta | null>;
  deSesion(sesionId: string): Promise<Pregunta[]>;
  abiertaDeSesion(sesionId: string): Promise<Pregunta | null>;
  guardar(pregunta: Pregunta): Promise<void>;
}
