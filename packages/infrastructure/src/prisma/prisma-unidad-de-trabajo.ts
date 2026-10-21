import type { UnidadDeTrabajo } from "@kuorum/application";
import type { ContextoTransaccional } from "./contexto-transaccional.js";

export class PrismaUnidadDeTrabajo implements UnidadDeTrabajo {
  constructor(private readonly contexto: ContextoTransaccional) {}

  ejecutar<T>(trabajo: () => Promise<T>): Promise<T> {
    return this.contexto.enTransaccion(() => trabajo());
  }
}
