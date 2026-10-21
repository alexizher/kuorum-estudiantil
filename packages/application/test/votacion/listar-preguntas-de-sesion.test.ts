import { describe, expect, it } from "vitest";
import { ListarPreguntasDeSesion } from "../../src/index.js";
import { crearEscenario, sembrarPregunta, sembrarSesion } from "../dobles/escenario.js";

describe("ListarPreguntasDeSesion", () => {
  it("devuelve las preguntas de la sesión, borradores incluidos, y no las de otra", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e);
    const otra = await sembrarSesion(e);
    const borrador = await sembrarPregunta(e, sesion.id, "BORRADOR");
    const cerrada = await sembrarPregunta(e, sesion.id, "CERRADA");
    await sembrarPregunta(e, otra.id, "ABIERTA");

    const preguntas = await new ListarPreguntasDeSesion(e.sesiones, e.preguntas).ejecutar(
      sesion.id,
    );

    expect(preguntas.map((p) => p.id)).toEqual([borrador.id, cerrada.id]);
  });

  it("falla con SESION_NO_ENCONTRADA si la sesión no existe", async () => {
    const e = crearEscenario();
    await expect(
      new ListarPreguntasDeSesion(e.sesiones, e.preguntas).ejecutar("nada"),
    ).rejects.toMatchObject({ codigo: "SESION_NO_ENCONTRADA" });
  });
});
