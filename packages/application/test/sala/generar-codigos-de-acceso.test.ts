import { describe, expect, it } from "vitest";
import {
  CODIGOS_MAXIMOS_POR_SESION_DE_DEMO,
  CODIGOS_MAXIMOS_POR_SOLICITUD_DE_DEMO,
  GenerarCodigosDeAcceso,
} from "../../src/index.js";
import { crearEscenario, sembrarSesion } from "../dobles/escenario.js";
import { demo, mesa, superadmin } from "../dobles/actores.js";

function casoDeUso(e: ReturnType<typeof crearEscenario>) {
  return new GenerarCodigosDeAcceso(e.sesiones, e.participantes, e.unidad, e.codigos, e.hasheador);
}

describe("GenerarCodigosDeAcceso", () => {
  it("devuelve el texto plano y guarda solo los hashes", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e, { modo: "CON_CODIGOS" });

    const codigos = await casoDeUso(e).ejecutar(superadmin, sesion.id, 3);

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
    await expect(casoDeUso(e).ejecutar(superadmin, sesion.id, 1)).rejects.toMatchObject({
      codigo: "MODO_SIN_CODIGOS",
    });
  });

  it.each([0, 2001, 1.5, Number.NaN])("rechaza la cantidad %s", async (cantidad) => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e, { modo: "CON_CODIGOS" });
    await expect(casoDeUso(e).ejecutar(superadmin, sesion.id, cantidad)).rejects.toMatchObject({
      codigo: "CANTIDAD_INVALIDA",
    });
  });

  it("acepta los extremos 1 y 2000", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e, { modo: "CON_CODIGOS" });
    expect(await casoDeUso(e).ejecutar(superadmin, sesion.id, 1)).toHaveLength(1);
    expect(await casoDeUso(e).ejecutar(superadmin, sesion.id, 2000)).toHaveLength(2000);
  });

  it("falla si la sesión no existe", async () => {
    const e = crearEscenario();
    await expect(casoDeUso(e).ejecutar(superadmin, "nada", 1)).rejects.toMatchObject({
      codigo: "SESION_NO_ENCONTRADA",
    });
  });

  describe("límites de la cuenta de prueba", () => {
    it("acepta 50 códigos por solicitud y rechaza 51", async () => {
      const e = crearEscenario();
      expect(CODIGOS_MAXIMOS_POR_SOLICITUD_DE_DEMO).toBe(50);
      const sesion = await sembrarSesion(e, { modo: "CON_CODIGOS", creadaPorId: demo.id });
      await expect(casoDeUso(e).ejecutar(demo, sesion.id, 51)).rejects.toMatchObject({
        codigo: "LIMITE_DE_CODIGOS_DE_DEMO",
      });
      expect(e.participantes.codigos.get(sesion.id)).toBeUndefined();
      expect(await casoDeUso(e).ejecutar(demo, sesion.id, 50)).toHaveLength(50);
    });

    it("rechaza lo que pase de 200 códigos en la sesión", async () => {
      const e = crearEscenario();
      expect(CODIGOS_MAXIMOS_POR_SESION_DE_DEMO).toBe(200);
      const sesion = await sembrarSesion(e, { modo: "CON_CODIGOS", creadaPorId: demo.id });
      for (let i = 0; i < 4; i += 1) await casoDeUso(e).ejecutar(demo, sesion.id, 50);
      await expect(casoDeUso(e).ejecutar(demo, sesion.id, 1)).rejects.toMatchObject({
        codigo: "LIMITE_DE_CODIGOS_DE_DEMO",
      });
      expect(await e.participantes.contarCodigos(sesion.id)).toBe(200);
    });

    it("cuenta los códigos ya activados dentro de los 200", async () => {
      const e = crearEscenario();
      const sesion = await sembrarSesion(e, { modo: "CON_CODIGOS", creadaPorId: demo.id });
      const primeros = await casoDeUso(e).ejecutar(demo, sesion.id, 50);
      await e.participantes.activarCodigo(sesion.id, e.hasheador.sha256(primeros[0] ?? ""));
      for (let i = 0; i < 2; i += 1) await casoDeUso(e).ejecutar(demo, sesion.id, 50);
      await casoDeUso(e).ejecutar(demo, sesion.id, 49);
      await expect(casoDeUso(e).ejecutar(demo, sesion.id, 2)).rejects.toMatchObject({
        codigo: "LIMITE_DE_CODIGOS_DE_DEMO",
      });
    });

    it("SUPERADMIN y MESA no tienen estos límites", async () => {
      const e = crearEscenario();
      const sesion = await sembrarSesion(e, { modo: "CON_CODIGOS" });
      expect(await casoDeUso(e).ejecutar(superadmin, sesion.id, 300)).toHaveLength(300);
      expect(await casoDeUso(e).ejecutar(mesa, sesion.id, 300)).toHaveLength(300);
    });
  });
});
