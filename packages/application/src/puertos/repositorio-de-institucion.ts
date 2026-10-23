import type { Institucion } from "@kuorum/domain";

/** Una sola institución por instalación: la crea la migración. */
export interface RepositorioDeInstitucion {
  obtener(): Promise<Institucion>;
  guardar(institucion: Institucion): Promise<void>;
}
