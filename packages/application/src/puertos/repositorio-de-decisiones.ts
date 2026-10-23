import type { Decision } from "@kuorum/domain";

export interface FiltroPublico {
  cuerpoId?: string;
  desde: Date;
  hasta: Date;
}

export interface RepositorioDeDecisiones {
  /** Lanza DECISION_REPETIDA si ya hay una decisión para esa pregunta. */
  guardar(decision: Decision): Promise<void>;
  deSesion(sesionId: string): Promise<Decision[]>;
  porId(id: string): Promise<Decision | null>;
  /** Solo de sesiones con acta final y no creadas por cuentas DEMO, por fecha de cierre. */
  publicas(filtro: FiltroPublico): Promise<Decision[]>;
}
