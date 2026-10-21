import { describe, expect, it } from "vitest";
import { AbrirPregunta, CrearPregunta } from "../../src/index.js";
import { crearEscenario, sembrarPregunta, sembrarSesion } from "../dobles/escenario.js";
import { superadmin } from "../dobles/actores.js";

function crear(e: ReturnType<typeof crearEscenario>) {
  return new CrearPregunta(e.sesiones, e.preguntas, e.ids, e.unidad);
}
function abrir(e: ReturnType<typeof crearEscenario>) {
  return new AbrirPregunta(e.sesiones, e.preguntas, e.reloj, e.unidad);
}

describe("CrearPregunta", () => {
  it.each(["PROGRAMADA", "ABIERTA", "EN_CURSO"] as const)(
    "crea en borrador con sesión %s y sube la versión",
    async (estado) => {
      const e = crearEscenario();
      const sesion = await sembrarSesion(e, { estado });

      const pregunta = await crear(e).ejecutar(
        superadmin,
        sesion.id,
        "¿Aprobamos el orden del día?",
        ["Sí", "No"],
      );

      expect(pregunta.estado).toBe("BORRADOR");
      expect(await e.preguntas.porId(pregunta.id)).toBe(pregunta);
      expect((await e.sesiones.porId(sesion.id))?.version).toBe(1);
    },
  );

  it("falla con SESION_NO_DISPONIBLE si la sesión terminó", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e, { estado: "CERRADA" });
    await expect(
      crear(e).ejecutar(superadmin, sesion.id, "¿Aprobamos el orden del día?", ["Sí", "No"]),
    ).rejects.toMatchObject({ codigo: "SESION_NO_DISPONIBLE" });
  });

  it("falla si la sesión no existe", async () => {
    const e = crearEscenario();
    await expect(
      crear(e).ejecutar(superadmin, "nada", "¿Aprobamos el orden del día?", ["Sí", "No"]),
    ).rejects.toMatchObject({ codigo: "SESION_NO_ENCONTRADA" });
  });

  it("propaga errores del dominio y no guarda ni sube la versión", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e, { estado: "EN_CURSO" });
    await expect(
      crear(e).ejecutar(superadmin, sesion.id, "¿Aprobamos el orden del día?", ["Sí"]),
    ).rejects.toMatchObject({ codigo: "OPCIONES_INVALIDAS" });
    expect(e.preguntas.preguntas.size).toBe(0);
    expect(sesion.version).toBe(0);
  });
});

describe("AbrirPregunta", () => {
  it("abre, sube la versión y guarda", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e, { estado: "EN_CURSO" });
    const pregunta = await sembrarPregunta(e, sesion.id);

    await abrir(e).ejecutar(superadmin, pregunta.id);

    expect((await e.preguntas.porId(pregunta.id))?.estado).toBe("ABIERTA");
    expect(sesion.version).toBe(1);
  });

  it("rechaza una segunda pregunta abierta con OTRA_PREGUNTA_ABIERTA", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e, { estado: "EN_CURSO" });
    await sembrarPregunta(e, sesion.id, "ABIERTA");
    const segunda = await sembrarPregunta(e, sesion.id);

    await expect(abrir(e).ejecutar(superadmin, segunda.id)).rejects.toMatchObject({
      codigo: "OTRA_PREGUNTA_ABIERTA",
    });
    expect(segunda.estado).toBe("BORRADOR");
    expect(sesion.version).toBe(0);
  });

  it("exige sesión EN_CURSO", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e, { estado: "PROGRAMADA" });
    const pregunta = await sembrarPregunta(e, sesion.id);
    await expect(abrir(e).ejecutar(superadmin, pregunta.id)).rejects.toMatchObject({
      codigo: "SESION_NO_EN_CURSO",
    });
  });

  it("reabrir la misma pregunta da TRANSICION_INVALIDA", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e, { estado: "EN_CURSO" });
    const pregunta = await sembrarPregunta(e, sesion.id, "ABIERTA");
    await expect(abrir(e).ejecutar(superadmin, pregunta.id)).rejects.toMatchObject({
      codigo: "TRANSICION_INVALIDA",
    });
  });

  it("falla con PREGUNTA_NO_ENCONTRADA", async () => {
    const e = crearEscenario();
    await expect(abrir(e).ejecutar(superadmin, "nada")).rejects.toMatchObject({
      codigo: "PREGUNTA_NO_ENCONTRADA",
    });
  });
});
