import type { Decision } from "@kuorum/domain";
import type { TipoDeCuerpo } from "@kuorum/domain";

export interface FiltroPublico {
  cuerpoId?: string;
  desde: Date;
  hasta: Date;
}

export interface DecisionesPorCuerpo {
  cuerpoId: string;
  cuerpoNombre: string;
  cuerpoSlug: string;
  cuerpoTipo: TipoDeCuerpo;
  decisiones: Decision[];
}

export interface RepositorioDeDecisiones {
  /** Lanza DECISION_REPETIDA si ya hay una decisión para esa pregunta. */
  guardar(decision: Decision): Promise<void>;
  deSesion(sesionId: string): Promise<Decision[]>;
  porId(id: string): Promise<Decision | null>;
  /** Al anular una votación cerrada; no falla si no hay. */
  eliminarDePregunta(preguntaId: string): Promise<void>;
  /** Solo de sesiones con acta final y no creadas por cuentas DEMO, por fecha de cierre. */
  publicas(filtro: FiltroPublico): Promise<Decision[]>;
  /** Decisiones públicas agrupadas por cuerpo (para la vista de la asamblea general). */
  publicasPorCuerpo(filtro: FiltroPublico): Promise<DecisionesPorCuerpo[]>;
}
