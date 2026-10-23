export type RolDeMesa = "SUPERADMIN" | "MESA" | "DEMO";

/** ENCARGADO programa y conduce las sesiones de su cuerpo; MESA solo las conduce. */
export type RolEnCuerpo = "ENCARGADO" | "MESA";

/**
 * Quien actúa desde la mesa. Cada caso de uso de la mesa lo recibe y decide con su rol.
 * SUPERADMIN administra la instalación; MESA es el personal y sus permisos salen de las
 * membresías; DEMO es la cuenta de prueba pública.
 */
export interface Actor {
  id: string;
  rol: RolDeMesa;
  membresias: readonly { cuerpoId: string; rol: RolEnCuerpo }[];
}
