import { describe, expect, it } from "vitest";
import { exigirAccesoASesion } from "../../src/index.js";
import { crearEscenario, sembrarSesion } from "../dobles/escenario.js";
import { demo, mesa, otraDemo, superadmin } from "../dobles/actores.js";

describe("exigirAccesoASesion", () => {
  it("la cuenta de prueba entra a lo que ella creó", async () => {
    const e = crearEscenario();
    const propia = await sembrarSesion(e, { creadaPorId: demo.id });
    expect(() => exigirAccesoASesion(demo, propia)).not.toThrow();
  });

  it("la cuenta de prueba no entra a lo de otra cuenta de prueba", async () => {
    const e = crearEscenario();
    const ajena = await sembrarSesion(e, { creadaPorId: otraDemo.id });
    expect(() => exigirAccesoASesion(demo, ajena)).toThrowError(
      expect.objectContaining({ codigo: "SESION_AJENA" }),
    );
  });

  it("la cuenta de prueba no entra a lo de la superadministración ni a lo que no tiene dueño", async () => {
    const e = crearEscenario();
    const deSuper = await sembrarSesion(e, { creadaPorId: superadmin.id });
    const sinDueno = await sembrarSesion(e);
    for (const sesion of [deSuper, sinDueno]) {
      expect(() => exigirAccesoASesion(demo, sesion)).toThrowError(
        expect.objectContaining({ codigo: "SESION_AJENA" }),
      );
    }
  });

  it("SUPERADMIN entra a todo", async () => {
    const e = crearEscenario();
    const sesiones = [
      await sembrarSesion(e, { creadaPorId: demo.id }),
      await sembrarSesion(e, { creadaPorId: superadmin.id }),
      await sembrarSesion(e),
    ];
    for (const sesion of sesiones)
      expect(() => exigirAccesoASesion(superadmin, sesion)).not.toThrow();
  });

  it("el personal entra a las de su cuerpo, pero no a las de la cuenta de prueba", async () => {
    const e = crearEscenario();
    const deSuper = await sembrarSesion(e, { creadaPorId: superadmin.id });
    const sinDueno = await sembrarSesion(e);
    const deDemo = await sembrarSesion(e, { creadaPorId: demo.id });
    for (const sesion of [deSuper, sinDueno]) {
      expect(() => exigirAccesoASesion(mesa, sesion)).not.toThrow();
    }
    expect(() => exigirAccesoASesion(mesa, deDemo)).toThrowError(
      expect.objectContaining({ codigo: "SESION_AJENA" }),
    );
  });
});
