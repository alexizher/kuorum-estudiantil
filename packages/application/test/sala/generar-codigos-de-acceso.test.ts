import { describe, expect, it } from "vitest";
import { GenerarCodigosDeAcceso } from "../../src/index.js";
import { crearEscenario, sembrarSesion } from "../dobles/escenario.js";

function casoDeUso(e: ReturnType<typeof crearEscenario>) {
  return new GenerarCodigosDeAcceso(e.sesiones, e.participantes, e.unidad, e.codigos, e.hasheador);
}

describe("GenerarCodigosDeAcceso", () => {
  it("devuelve el texto plano y guarda solo los hashes", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e, { modo: "CON_CODIGOS" });

    const codigos = await casoDeUso(e).ejecutar(sesion.id, 3);

    expect(codigos).toHaveLength(3);
    expect(new Set(codigos).size).toBe(3);
    const guardados = [...(e.participantes.codigos.get(sesion.id)?.keys() ?? [])];
    expect(guardados).toEqual(codigos.map((c) => e.hasheador.sha256(c)));
    for (const codigo of codigos) {
      expect(e.participantes.volcado()).not.toContain(codigo);
    }
    expect(e.unidad.ejecuciones).toBe(1);
  });

  it("falla con MODO_SIN_CODIGOS en sala abierta", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e, { modo: "SALA_ABIERTA" });
    await expect(casoDeUso(e).ejecutar(sesion.id, 1)).rejects.toMatchObject({
      codigo: "MODO_SIN_CODIGOS",
    });
  });

  it.each([0, 2001, 1.5, Number.NaN])("rechaza la cantidad %s", async (cantidad) => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e, { modo: "CON_CODIGOS" });
    await expect(casoDeUso(e).ejecutar(sesion.id, cantidad)).rejects.toMatchObject({
      codigo: "CANTIDAD_INVALIDA",
    });
  });

  it("acepta los extremos 1 y 2000", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e, { modo: "CON_CODIGOS" });
    expect(await casoDeUso(e).ejecutar(sesion.id, 1)).toHaveLength(1);
    expect(await casoDeUso(e).ejecutar(sesion.id, 2000)).toHaveLength(2000);
  });

  it("falla si la sesión no existe", async () => {
    const e = crearEscenario();
    await expect(casoDeUso(e).ejecutar("nada", 1)).rejects.toMatchObject({
      codigo: "SESION_NO_ENCONTRADA",
    });
  });
});
