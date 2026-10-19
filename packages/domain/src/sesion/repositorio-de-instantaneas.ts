import type { InstantaneaDeSesion } from "./instantanea-de-sesion.js";

export interface RepositorioDeInstantaneas {
  obtener(sesionId: string): Promise<InstantaneaDeSesion | null>;
}
