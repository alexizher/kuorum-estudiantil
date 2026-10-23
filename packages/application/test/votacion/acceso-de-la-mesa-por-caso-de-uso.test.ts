import { describe, expect, it } from "vitest";
import {
  AbrirPregunta,
  AnularPregunta,
  CerrarPregunta,
  CrearPregunta,
  ListarPreguntasDeSesion,
  ProyectarResultado,
} from "../../src/index.js";
import { crearEscenario, sembrarPregunta, sembrarSesion } from "../dobles/escenario.js";
import { demo, mesa, superadmin } from "../dobles/actores.js";

async function montar() {
  const e = crearEscenario();
  const propia = await sembrarSesion(e, { creadaPorId: demo.id, estado: "EN_CURSO" });
  const deSuper = await sembrarSesion(e, { creadaPorId: superadmin.id, estado: "EN_CURSO" });
  return { e, propia, deSuper };
}

describe("familia votación: la cuenta de prueba solo toca sus sesiones", () => {
  it("CrearPregunta", async () => {
    const { e, propia, deSuper } = await montar();
    const caso = new CrearPregunta(e.sesiones, e.preguntas, e.ids, e.unidad);
    await expect(
      caso.ejecutar(demo, deSuper.id, "¿Aprobamos?", ["Sí", "No"]),
    ).rejects.toMatchObject({ codigo: "SESION_AJENA" });
    expect(await e.preguntas.deSesion(deSuper.id)).toHaveLength(0);
    await expect(
      caso.ejecutar(demo, propia.id, "¿Aprobamos?", ["Sí", "No"]),
    ).resolves.toBeDefined();
    await expect(
      caso.ejecutar(mesa, deSuper.id, "¿Aprobamos?", ["Sí", "No"]),
    ).resolves.toBeDefined();
  });

  it("ListarPreguntasDeSesion", async () => {
    const { e, propia, deSuper } = await montar();
    const caso = new ListarPreguntasDeSesion(e.sesiones, e.preguntas, e.votos);
    await expect(caso.ejecutar(demo, deSuper.id)).rejects.toMatchObject({ codigo: "SESION_AJENA" });
    await expect(caso.ejecutar(demo, propia.id)).resolves.toEqual([]);
    await expect(caso.ejecutar(superadmin, propia.id)).resolves.toEqual([]);
  });

  // Una pregunta ajena responde igual que una que no existe: no revela que está.
  it.each([
    [
      "AbrirPregunta",
      (e: ReturnType<typeof crearEscenario>) =>
        new AbrirPregunta(e.sesiones, e.preguntas, e.reloj, e.unidad),
      "BORRADOR" as const,
    ],
    [
      "CerrarPregunta",
      (e: ReturnType<typeof crearEscenario>) =>
        new CerrarPregunta(
          e.preguntas,
          e.sesiones,
          e.votos,
          e.reloj,
          e.unidad,
          e.decisiones,
          e.participantes,
          e.ids,
        ),
      "ABIERTA" as const,
    ],
    [
      "AnularPregunta",
      (e: ReturnType<typeof crearEscenario>) =>
        new AnularPregunta(e.preguntas, e.sesiones, e.unidad, e.decisiones),
      "BORRADOR" as const,
    ],
    [
      "ProyectarResultado",
      (e: ReturnType<typeof crearEscenario>) =>
        new ProyectarResultado(e.preguntas, e.sesiones, e.unidad),
      "CERRADA" as const,
    ],
  ])("%s", async (_nombre, fabricar, estado) => {
    const { e, propia, deSuper } = await montar();
    const ajena = await sembrarPregunta(e, deSuper.id, estado);
    const propiaPregunta = await sembrarPregunta(e, propia.id, estado);
    const caso = fabricar(e);

    await expect(caso.ejecutar(demo, ajena.id)).rejects.toMatchObject({
      codigo: "PREGUNTA_NO_ENCONTRADA",
    });
    expect(ajena.estado).toBe(estado);
    expect(deSuper.version).toBe(0);
    await expect(caso.ejecutar(demo, propiaPregunta.id)).resolves.not.toThrow();
    await expect(caso.ejecutar(demo, "nada")).rejects.toMatchObject({
      codigo: "PREGUNTA_NO_ENCONTRADA",
    });
  });

  it("SUPERADMIN opera preguntas de cualquier sesión; el personal no toca las de la cuenta de prueba", async () => {
    const { e, propia } = await montar();
    const pregunta = await sembrarPregunta(e, propia.id, "BORRADOR");
    const abrir = new AbrirPregunta(e.sesiones, e.preguntas, e.reloj, e.unidad);
    await expect(abrir.ejecutar(superadmin, pregunta.id)).resolves.toBeUndefined();
    const cerrar = new CerrarPregunta(
      e.preguntas,
      e.sesiones,
      e.votos,
      e.reloj,
      e.unidad,
      e.decisiones,
      e.participantes,
      e.ids,
    );
    await expect(cerrar.ejecutar(mesa, pregunta.id)).rejects.toMatchObject({
      codigo: "PREGUNTA_NO_ENCONTRADA",
    });
    await expect(cerrar.ejecutar(superadmin, pregunta.id)).resolves.toBeDefined();
  });
});
