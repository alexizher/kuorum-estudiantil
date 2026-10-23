import type { Acta, CodigoDeVerificacion, Sesion } from "@kuorum/domain";
import type { FiltroPublico } from "./repositorio-de-decisiones.js";

export interface RepositorioDeActas {
  deSesion(sesionId: string): Promise<Acta | null>;
  porCodigo(codigo: CodigoDeVerificacion): Promise<Acta | null>;
  /** Crea o actualiza. */
  guardar(acta: Acta): Promise<void>;
  /** Solo actas finales de sesiones no creadas por cuentas DEMO. */
  publicas(filtro: FiltroPublico): Promise<{ acta: Acta; sesion: Sesion }[]>;
}
