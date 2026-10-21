import { describe, expect, it } from "vitest";
import { IniciarSesion, TerminarSesion } from "../../src/index.js";
import { crearEscenario, sembrarPregunta, sembrarSesion } from "../dobles/escenario.js";

describe("IniciarSesion", () => {
  it("pasa a EN_CURSO, sube la versión y guarda", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e);

    await new IniciarSesion(e.sesiones, e.unidad).ejecutar(sesion.id);

    const guardada = await e.sesiones.porId(sesion.id);
    expect(guardada?.estado).toBe("EN_CURSO");
    expect(guardada?.version).toBe(1);
    expect(e.unidad.ejecuciones).toBe(1);
  });

  it("falla si la sesión no existe", async () => {
    const e = crearEscenario();
    await expect(new IniciarSesion(e.sesiones, e.unidad).ejecutar("nada")).rejects.toMatchObject({
      codigo: "SESION_NO_ENCONTRADA",
    });
  });

  it("falla con TRANSICION_INVALIDA si ya terminó", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e, { estado: "CERRADA" });
    await expect(new IniciarSesion(e.sesiones, e.unidad).ejecutar(sesion.id)).rejects.toMatchObject(
      { codigo: "TRANSICION_INVALIDA" },
    );
  });
});

describe("TerminarSesion", () => {
  it("pasa a CERRADA y sube la versión", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e, { estado: "EN_CURSO" });

    await new TerminarSesion(e.sesiones, e.preguntas, e.unidad).ejecutar(sesion.id);

    const guardada = await e.sesiones.porId(sesion.id);
    expect(guardada?.estado).toBe("CERRADA");
    expect(guardada?.version).toBe(1);
  });

  it("falla si no estaba en curso y no sube la versión", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e);
    await expect(
      new TerminarSesion(e.sesiones, e.preguntas, e.unidad).ejecutar(sesion.id),
    ).rejects.toMatchObject({ codigo: "TRANSICION_INVALIDA" });
    expect(sesion.version).toBe(0);
  });

  it("falla si la sesión no existe", async () => {
    const e = crearEscenario();
    await expect(
      new TerminarSesion(e.sesiones, e.preguntas, e.unidad).ejecutar("nada"),
    ).rejects.toMatchObject({
      codigo: "SESION_NO_ENCONTRADA",
    });
  });

  it("se niega mientras haya una votación abierta y no cambia nada", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e, { estado: "EN_CURSO" });
    await sembrarPregunta(e, sesion.id, "ABIERTA");
    await expect(
      new TerminarSesion(e.sesiones, e.preguntas, e.unidad).ejecutar(sesion.id),
    ).rejects.toMatchObject({ codigo: "SESION_CON_VOTACION_ABIERTA" });
    expect(sesion.estado).toBe("EN_CURSO");
    expect(sesion.version).toBe(0);
  });

  it("termina si las preguntas están cerradas o en borrador", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e, { estado: "EN_CURSO" });
    await sembrarPregunta(e, sesion.id, "CERRADA");
    await sembrarPregunta(e, sesion.id, "BORRADOR");
    await new TerminarSesion(e.sesiones, e.preguntas, e.unidad).ejecutar(sesion.id);
    expect(sesion.estado).toBe("CERRADA");
  });
});
