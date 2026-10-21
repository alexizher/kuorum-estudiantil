import type { CodigoDeSala, Sesion } from "@kuorum/domain";
import type { RepositorioDeSesiones } from "../../src/puertos/repositorio-de-sesiones.js";

export class RepositorioDeSesionesEnMemoria implements RepositorioDeSesiones {
  readonly sesiones = new Map<string, Sesion>();

  async porId(id: string): Promise<Sesion | null> {
    return this.sesiones.get(id) ?? null;
  }

  async porCodigoDeSala(codigo: CodigoDeSala): Promise<Sesion | null> {
    for (const sesion of this.sesiones.values()) {
      if (sesion.codigoDeSala.valor === codigo.valor) return sesion;
    }
    return null;
  }

  async guardar(sesion: Sesion): Promise<void> {
    this.sesiones.set(sesion.id, sesion);
  }

  async listar(filtro: { creadaPorId?: string } = {}): Promise<Sesion[]> {
    return [...this.sesiones.values()].filter(
      (s) => filtro.creadaPorId === undefined || s.creadaPorId === filtro.creadaPorId,
    );
  }

  async contarActivasDe(creadaPorId: string): Promise<number> {
    return [...this.sesiones.values()].filter((s) => s.creadaPorId === creadaPorId && s.activa)
      .length;
  }
}
