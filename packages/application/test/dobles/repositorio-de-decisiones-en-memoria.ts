import { ErrorDeDominio, type Decision, type TipoDeCuerpo } from "@kuorum/domain";
import type {
  DecisionesPorCuerpo,
  FiltroPublico,
  RepositorioDeDecisiones,
} from "../../src/puertos/repositorio-de-decisiones.js";
import type { RepositorioDeSesionesEnMemoria } from "./repositorio-de-sesiones-en-memoria.js";
import type { RepositorioDeCuerposEnMemoria } from "./repositorio-de-cuerpos-en-memoria.js";

export class RepositorioDeDecisionesEnMemoria implements RepositorioDeDecisiones {
  readonly decisiones = new Map<string, Decision>();

  constructor(
    private readonly sesiones: RepositorioDeSesionesEnMemoria,
    private readonly cuerpos: RepositorioDeCuerposEnMemoria,
  ) {}

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

  async eliminarDePregunta(preguntaId: string): Promise<void> {
    for (const [id, d] of this.decisiones)
      if (d.preguntaId === preguntaId) this.decisiones.delete(id);
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

  async publicasPorCuerpo(filtro: FiltroPublico): Promise<DecisionesPorCuerpo[]> {
    const porCuerpo = new Map<string, DecisionesPorCuerpo>();
    for (const d of this.decisiones.values()) {
      const sesion = await this.sesiones.porId(d.sesionId);
      if (sesion === null || sesion.estado !== "ACTA_FINAL" || sesion.creadaPorDemo) continue;
      if (filtro.cuerpoId !== undefined && d.cuerpoId !== filtro.cuerpoId) continue;
      if (d.cerradaEn < filtro.desde || d.cerradaEn >= filtro.hasta) continue;

      const cuerpo = await this.cuerpos.porId(d.cuerpoId);
      const key = d.cuerpoId;
      let grupo = porCuerpo.get(key);
      if (grupo === undefined) {
        grupo = {
          cuerpoId: d.cuerpoId,
          cuerpoNombre: cuerpo?.nombre ?? d.cuerpoId,
          cuerpoSlug: cuerpo?.slug ?? "",
          cuerpoTipo: (cuerpo?.tipo as TipoDeCuerpo) ?? "FACULTAD",
          decisiones: [],
        };
        porCuerpo.set(key, grupo);
      }
      grupo.decisiones.push(d);
    }
    return Array.from(porCuerpo.values()).sort((a, b) => {
      if (a.cuerpoTipo === "GENERAL" && b.cuerpoTipo !== "GENERAL") return -1;
      if (b.cuerpoTipo === "GENERAL" && a.cuerpoTipo !== "GENERAL") return 1;
      return a.cuerpoNombre.localeCompare(b.cuerpoNombre);
    });
  }
}
