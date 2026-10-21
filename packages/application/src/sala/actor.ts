export type RolDeMesa = "SUPERADMIN" | "MESA" | "DEMO";

/** Quien actúa desde la mesa. Cada caso de uso de la mesa lo recibe y decide con su rol. */
export interface Actor {
  id: string;
  rol: RolDeMesa;
}
