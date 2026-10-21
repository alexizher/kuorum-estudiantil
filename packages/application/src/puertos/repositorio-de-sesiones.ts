import type { CodigoDeSala, Sesion } from "@kuorum/domain";

export interface RepositorioDeSesiones {
  porId(id: string): Promise<Sesion | null>;
  porCodigoDeSala(codigo: CodigoDeSala): Promise<Sesion | null>;
  guardar(sesion: Sesion): Promise<void>;
  listar(): Promise<Sesion[]>;
}
