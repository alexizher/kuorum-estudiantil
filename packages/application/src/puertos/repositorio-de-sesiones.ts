import type { CodigoDeSala, Sesion } from "@kuorum/domain";

export interface RepositorioDeSesiones {
  porId(id: string): Promise<Sesion | null>;
  porCodigoDeSala(codigo: CodigoDeSala): Promise<Sesion | null>;
  guardar(sesion: Sesion): Promise<void>;
  /** Sin filtro, todas, de la más antigua a la más reciente. `sinCuentaDePrueba` deja fuera las creadas por cuentas DEMO. */
  listar(filtro?: { creadaPorId?: string; sinCuentaDePrueba?: boolean }): Promise<Sesion[]>;
  /** Todas las de un creador, en cualquier estado. */
  contarDe(creadaPorId: string): Promise<number>;
  /** Sesiones sin terminar (ni cerradas, ni con acta final, ni canceladas) de un creador. */
  contarActivasDe(creadaPorId: string): Promise<number>;
}
