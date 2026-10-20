import type { Participante } from "../sala/participante.js";

export type ResultadoDeActivacion = "ACTIVADO" | "YA_ACTIVO" | "NO_EXISTE";

export interface RepositorioDeParticipantes {
  porCredencial(sesionId: string, hash: string): Promise<Participante | null>;
  crear(participante: Participante): Promise<void>;
  guardarCodigos(sesionId: string, hashes: string[]): Promise<void>;
  activarCodigo(sesionId: string, hash: string): Promise<ResultadoDeActivacion>;
  contarActivos(sesionId: string): Promise<number>;
}
