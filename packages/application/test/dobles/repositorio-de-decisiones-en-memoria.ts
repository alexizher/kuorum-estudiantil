import { ErrorDeDominio, type Decision } from "@kuorum/domain";
import type {
  FiltroPublico,
  RepositorioDeDecisiones,
} from "../../src/puertos/repositorio-de-decisiones.js";
import type { RepositorioDeSesionesEnMemoria } from "./repositorio-de-sesiones-en-memoria.js";

export class RepositorioDeDecisionesEnMemoria implements RepositorioDeDecisiones {
  readonly decisiones = new Map<string, Decision>();

  constructor(private readonly sesiones: RepositorioDeSesionesEnMemoria) {}

  async guardar(decision: Decision): Promise<void> {
    const repetida = [...this.decisiones.values()].some(
      (d) => d.preguntaId === decision.preguntaId && d.id !== decision.id,
    );
    if (repetida) throw new ErrorDeDominio("DECISION_REPETIDA");
    this.decisiones.set(decision.id, decision);
  }

  async deSesion(sesionId: string): Promise<Decision[]> {
    return [...this.decisiones.values()]
      .filter((d) => d.sesionId === sesionId)
      .sort((a, b) => a.cerradaEn.getTime() - b.cerradaEn.getTime());
  }

  async porId(id: string): Promise<Decision | null> {
    return this.decisiones.get(id) ?? null;
  }

  async publicas(filtro: FiltroPublico): Promise<Decision[]> {
    const resultado: Decision[] = [];
    for (const d of this.decisiones.values()) {
      const sesion = await this.sesiones.porId(d.sesionId);
      if (sesion === null || sesion.estado !== "ACTA_FINAL" || sesion.creadaPorDemo) continue;
      if (filtro.cuerpoId !== undefined && d.cuerpoId !== filtro.cuerpoId) continue;
      if (d.cerradaEn < filtro.desde || d.cerradaEn >= filtro.hasta) continue;
      resultado.push(d);
    }
    return resultado.sort((a, b) => a.cerradaEn.getTime() - b.cerradaEn.getTime());
  }
}
