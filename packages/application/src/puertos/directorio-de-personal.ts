import type { Membresia } from "./repositorio-de-membresias.js";

export interface PersonaDelPersonal {
  id: string;
  nombre: string;
  correo: string;
  membresias: Membresia[];
}

/** Las cuentas MESA. Las de SUPERADMIN y DEMO no se administran desde el panel. */
export interface DirectorioDePersonal {
  listar(): Promise<PersonaDelPersonal[]>;
  existe(usuarioId: string): Promise<boolean>;
}
