import type { CodigoDeSala, Sesion } from "@kuorum/domain";

export interface FiltroDeSesiones {
  creadaPorId?: string;
  /** Deja fuera las creadas por cuentas DEMO. */
  sinCuentaDePrueba?: boolean;
  cuerpoIds?: readonly string[];
}

export interface FiltroDeRango {
  cuerpoId?: string;
  /** Las de cuentas DEMO quedan fuera, salvo las de este creador. */
  incluirDe?: string;
  sinCanceladas?: boolean;
}

export interface RepositorioDeSesiones {
  porId(id: string): Promise<Sesion | null>;
  /**
   * Como porId, pero toma el candado de la sesión hasta que termine la unidad de trabajo:
   * las acciones que lo piden sobre la misma sesión van una tras otra.
   */
  porIdBloqueando(id: string): Promise<Sesion | null>;
  porCodigoDeSala(codigo: CodigoDeSala): Promise<Sesion | null>;
  guardar(sesion: Sesion): Promise<void>;
  /** Sin filtro, todas, de la más antigua a la más reciente según su creación. */
  listar(filtro?: FiltroDeSesiones): Promise<Sesion[]>;
  /** Las que se cruzan con [desde, hasta), por inicio. Sin las de cuentas DEMO salvo `incluirDe`. */
  enRango(desde: Date, hasta: Date, filtro?: FiltroDeRango): Promise<Sesion[]>;
  /** Todas las de un creador, en cualquier estado. */
  contarDe(creadaPorId: string): Promise<number>;
  /** Sesiones sin terminar (ni cerradas, ni con acta final, ni canceladas) de un creador. */
  contarActivasDe(creadaPorId: string): Promise<number>;
}
