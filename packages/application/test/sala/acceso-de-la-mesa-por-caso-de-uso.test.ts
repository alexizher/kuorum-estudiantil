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
  async function montarLista() {
    const { e, propia, deSuper } = await montar();
    e.sesiones.cuentasDeDemo.add(demo.id);
    e.sesiones.cuentasDeDemo.add(otraDemo.id);
    const deOtraDemo = await sembrarSesion(e, { creadaPorId: otraDemo.id });
    const deMesa = await sembrarSesion(e, { creadaPorId: mesa.id });
    const sinDueno = await sembrarSesion(e);
    return {
      e,
      propia,
      deSuper,
      deOtraDemo,
      deMesa,
      sinDueno,
      caso: new ListarSesionesDeLaMesa(e.sesiones),
    };
  }

  it("la cuenta de prueba solo ve las suyas, con o sin la opción", async () => {
    const { propia, caso } = await montarLista();
    expect((await caso.ejecutar(demo)).map((s) => s.id)).toEqual([propia.id]);
    expect((await caso.ejecutar(demo, { incluirCuentaDePrueba: true })).map((s) => s.id)).toEqual([
      propia.id,
    ]);
  });

  it("SUPERADMIN y MESA no ven las de la cuenta de prueba por defecto", async () => {
    const { deSuper, deMesa, sinDueno, caso } = await montarLista();
    const esperadas = [deSuper.id, deMesa.id, sinDueno.id];
    expect((await caso.ejecutar(superadmin)).map((s) => s.id)).toEqual(esperadas);
    expect((await caso.ejecutar(mesa)).map((s) => s.id)).toEqual(esperadas);
  });

  it("solo SUPERADMIN puede pedir también las de la cuenta de prueba", async () => {
    const { propia, deSuper, deOtraDemo, deMesa, sinDueno, caso } = await montarLista();
    const todas = [propia.id, deSuper.id, deOtraDemo.id, deMesa.id, sinDueno.id];
    expect(
      (await caso.ejecutar(superadmin, { incluirCuentaDePrueba: true })).map((s) => s.id),
    ).toEqual(todas);
    expect((await caso.ejecutar(mesa, { incluirCuentaDePrueba: true })).map((s) => s.id)).toEqual([
      deSuper.id,
      deMesa.id,
      sinDueno.id,
    ]);
  });
});
