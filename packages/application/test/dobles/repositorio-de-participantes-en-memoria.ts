import type { Participante } from "../../src/sala/participante.js";
import type {
  RepositorioDeParticipantes,
  ResultadoDeActivacion,
} from "../../src/puertos/repositorio-de-participantes.js";

export class RepositorioDeParticipantesEnMemoria implements RepositorioDeParticipantes {
  readonly participantes: Participante[] = [];
  // sesionId -> hash -> activo
  readonly codigos = new Map<string, Map<string, boolean>>();

  async porCredencial(sesionId: string, hash: string): Promise<Participante | null> {
    return this.participantes.find((p) => p.sesionId === sesionId && p.hash === hash) ?? null;
  }

  async crear(participante: Participante): Promise<void> {
    this.participantes.push(participante);
  }

  async guardarCodigos(sesionId: string, hashes: string[]): Promise<void> {
    const existentes = this.codigos.get(sesionId) ?? new Map<string, boolean>();
    for (const hash of hashes) existentes.set(hash, false);
    this.codigos.set(sesionId, existentes);
  }

  async activarCodigo(sesionId: string, hash: string): Promise<ResultadoDeActivacion> {
    const codigos = this.codigos.get(sesionId);
    const activo = codigos?.get(hash);
    if (codigos === undefined || activo === undefined) return "NO_EXISTE";
    if (activo) return "YA_ACTIVO";
    codigos.set(hash, true);
    return "ACTIVADO";
  }

  async contarActivos(sesionId: string): Promise<number> {
    return this.participantes.filter((p) => p.sesionId === sesionId).length;
  }

  /** Todo lo guardado, para comprobar que no hay texto plano. */
  volcado(): string {
    return JSON.stringify({
      participantes: this.participantes,
      codigos: [...this.codigos.entries()].map(([sesion, mapa]) => [sesion, [...mapa.entries()]]),
    });
  }
}
