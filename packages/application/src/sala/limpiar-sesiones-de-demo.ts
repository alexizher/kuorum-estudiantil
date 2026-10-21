import type { LimpiezaDeDemo } from "../puertos/limpieza-de-demo.js";
import type { UnidadDeTrabajo } from "../puertos/unidad-de-trabajo.js";

/** Tarea diaria: deja la cuenta de prueba sin sesiones. No toca lo de SUPERADMIN ni MESA. */
export class LimpiarSesionesDeDemo {
  constructor(
    private readonly limpieza: LimpiezaDeDemo,
    private readonly unidad: UnidadDeTrabajo,
  ) {}

  ejecutar(): Promise<number> {
    return this.unidad.ejecutar(() => this.limpieza.eliminarSesionesDeLaCuentaDePrueba());
  }
}
