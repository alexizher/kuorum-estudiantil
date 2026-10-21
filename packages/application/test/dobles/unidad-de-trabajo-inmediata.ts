import type { UnidadDeTrabajo } from "../../src/puertos/unidad-de-trabajo.js";

export class UnidadDeTrabajoInmediata implements UnidadDeTrabajo {
  ejecuciones = 0;

  async ejecutar<T>(trabajo: () => Promise<T>): Promise<T> {
    this.ejecuciones += 1;
    return trabajo();
  }
}
