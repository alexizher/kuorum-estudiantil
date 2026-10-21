import { describe, expect, it } from "vitest";
import {
  GenerarCodigosDeAcceso,
  IniciarSesion,
  ListarSesionesDeLaMesa,
  ObtenerSesionDeLaMesa,
  TerminarSesion,
} from "../../src/index.js";
import { crearEscenario, sembrarSesion } from "../dobles/escenario.js";
import { demo, mesa, otraDemo, superadmin } from "../dobles/actores.js";

async function montar() {
  const e = crearEscenario();
  const propia = await sembrarSesion(e, {
    creadaPorId: demo.id,
    modo: "CON_CODIGOS",
    estado: "EN_CURSO",
  });
  const deSuper = await sembrarSesion(e, {
    creadaPorId: superadmin.id,
    modo: "CON_CODIGOS",
    estado: "EN_CURSO",
  });
  return { e, propia, deSuper };
}

describe("familia sala: la cuenta de prueba solo toca sus sesiones", () => {
  it("IniciarSesion", async () => {
    const { e, propia, deSuper } = await montar();
    const caso = new IniciarSesion(e.sesiones, e.unidad);
    const programada = await sembrarSesion(e, { creadaPorId: demo.id });
    const otraProgramada = await sembrarSesion(e, { creadaPorId: superadmin.id });
    const tercera = await sembrarSesion(e, { creadaPorId: demo.id });
    await expect(caso.ejecutar(demo, otraProgramada.id)).rejects.toMatchObject({
      codigo: "SESION_AJENA",
    });
    expect(otraProgramada.estado).toBe("PROGRAMADA");
    await expect(caso.ejecutar(otraDemo, programada.id)).rejects.toMatchObject({
      codigo: "SESION_AJENA",
    });
    await expect(caso.ejecutar(demo, programada.id)).resolves.toBeUndefined();
    await expect(caso.ejecutar(superadmin, tercera.id)).resolves.toBeUndefined();
    await expect(caso.ejecutar(mesa, otraProgramada.id)).resolves.toBeUndefined();
    expect([propia.estado, deSuper.estado]).toEqual(["EN_CURSO", "EN_CURSO"]);
  });

  it("TerminarSesion", async () => {
    const { e, propia, deSuper } = await montar();
    const caso = new TerminarSesion(e.sesiones, e.preguntas, e.unidad);
    await expect(caso.ejecutar(demo, deSuper.id)).rejects.toMatchObject({ codigo: "SESION_AJENA" });
    expect(deSuper.estado).toBe("EN_CURSO");
    await expect(caso.ejecutar(demo, propia.id)).resolves.toBeUndefined();
  });

  it("GenerarCodigosDeAcceso", async () => {
    const { e, propia, deSuper } = await montar();
    const caso = new GenerarCodigosDeAcceso(
      e.sesiones,
      e.participantes,
      e.unidad,
      e.codigos,
      e.hasheador,
    );
    await expect(caso.ejecutar(demo, deSuper.id, 1)).rejects.toMatchObject({
      codigo: "SESION_AJENA",
    });
    expect(e.participantes.codigos.get(deSuper.id)).toBeUndefined();
    await expect(caso.ejecutar(demo, propia.id, 1)).resolves.toHaveLength(1);
    await expect(caso.ejecutar(superadmin, deSuper.id, 1)).resolves.toHaveLength(1);
  });

  it("ObtenerSesionDeLaMesa", async () => {
    const { e, propia, deSuper } = await montar();
    const caso = new ObtenerSesionDeLaMesa(e.sesiones);
    await expect(caso.ejecutar(demo, deSuper.id)).rejects.toMatchObject({ codigo: "SESION_AJENA" });
    await expect(caso.ejecutar(demo, "nada")).rejects.toMatchObject({
      codigo: "SESION_NO_ENCONTRADA",
    });
    expect((await caso.ejecutar(demo, propia.id)).id).toBe(propia.id);
    expect((await caso.ejecutar(mesa, deSuper.id)).id).toBe(deSuper.id);
  });
});

describe("ListarSesionesDeLaMesa", () => {
  it("la cuenta de prueba solo ve las suyas; SUPERADMIN y MESA ven todas", async () => {
    const { e, propia, deSuper } = await montar();
    const sinDueno = await sembrarSesion(e);
    const caso = new ListarSesionesDeLaMesa(e.sesiones);

    expect((await caso.ejecutar(demo)).map((s) => s.id)).toEqual([propia.id]);
    expect(await caso.ejecutar(otraDemo)).toEqual([]);
    const todas = [propia.id, deSuper.id, sinDueno.id];
    expect((await caso.ejecutar(superadmin)).map((s) => s.id)).toEqual(todas);
    expect((await caso.ejecutar(mesa)).map((s) => s.id)).toEqual(todas);
  });
});
