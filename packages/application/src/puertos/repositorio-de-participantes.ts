import type { Participante } from "../sala/participante.js";

export type ResultadoDeActivacion = "ACTIVADO" | "YA_ACTIVO" | "NO_EXISTE";

export interface RepositorioDeParticipantes {
  porId(id: string): Promise<Participante | null>;
  porCredencial(sesionId: string, hash: string): Promise<Participante | null>;
  /**
   * Si ya existe un participante con la misma credencial en la sesión (dos primeras
   * entradas simultáneas), no falla: devuelve el existente y descarta el recibido.
   */
  crear(participante: Participante): Promise<Participante>;
  guardarCodigos(sesionId: string, hashes: string[]): Promise<void>;
  activarCodigo(sesionId: string, hash: string): Promise<ResultadoDeActivacion>;
  contarActivos(sesionId: string): Promise<number>;
}
