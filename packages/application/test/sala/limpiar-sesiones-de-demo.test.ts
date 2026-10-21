import { describe, expect, it } from "vitest";
import { LimpiarSesionesDeDemo, type LimpiezaDeDemo } from "../../src/index.js";
import { UnidadDeTrabajoInmediata } from "../dobles/unidad-de-trabajo-inmediata.js";

class LimpiezaEnMemoria implements LimpiezaDeDemo {
  llamadas = 0;
  constructor(private readonly borradas: number) {}
  async eliminarSesionesDeLaCuentaDePrueba(): Promise<number> {
    this.llamadas += 1;
    return this.borradas;
  }
}

describe("LimpiarSesionesDeDemo", () => {
  it("borra en una sola unidad de trabajo y devuelve cuántas sesiones eran", async () => {
    const unidad = new UnidadDeTrabajoInmediata();
    const limpieza = new LimpiezaEnMemoria(4);

    expect(await new LimpiarSesionesDeDemo(limpieza, unidad).ejecutar()).toBe(4);

    expect(limpieza.llamadas).toBe(1);
    expect(unidad.ejecuciones).toBe(1);
  });
});
