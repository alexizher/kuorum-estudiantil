import type { RolEnCuerpo } from "../sala/actor.js";

export interface Membresia {
  usuarioId: string;
  cuerpoId: string;
  rol: RolEnCuerpo;
}

export interface RepositorioDeMembresias {
  deUsuario(usuarioId: string): Promise<Membresia[]>;
  /** Si ya tenía una en ese cuerpo, le cambia el rol. */
  asignar(membresia: Membresia): Promise<void>;
  quitar(usuarioId: string, cuerpoId: string): Promise<void>;
}
