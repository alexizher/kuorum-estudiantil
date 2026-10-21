import type { Participante } from "../../src/sala/participante.js";
import type {
  RepositorioDeParticipantes,
  ResultadoDeActivacion,
} from "../../src/puertos/repositorio-de-participantes.js";

export class RepositorioDeParticipantesEnMemoria implements RepositorioDeParticipantes {
  readonly participantes: Participante[] = [];
  // sesionId -> hash -> activo
  readonly codigos = new Map<string, Map<string, boolean>>();

  async porId(id: string): Promise<Participante | null> {
    return this.participantes.find((p) => p.id === id) ?? null;
  }

  async porCredencial(sesionId: string, hash: string): Promise<Participante | null> {
    return this.participantes.find((p) => p.sesionId === sesionId && p.hash === hash) ?? null;
  }

  async crear(participante: Participante): Promise<Participante> {
    const existente = await this.porCredencial(participante.sesionId, participante.hash);
    if (existente !== null) return existente;
    this.participantes.push(participante);
    return participante;
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
    // Como la base: códigos activados, no participantes.
    return [...(this.codigos.get(sesionId)?.values() ?? [])].filter(Boolean).length;
  }

  async contarCodigos(sesionId: string): Promise<number> {
    return this.codigos.get(sesionId)?.size ?? 0;
  }

  /** Todo lo guardado, para comprobar que no hay texto plano. */
  volcado(): string {
    return JSON.stringify({
      participantes: this.participantes,
      codigos: [...this.codigos.entries()].map(([sesion, mapa]) => [sesion, [...mapa.entries()]]),
    });
  }
}
