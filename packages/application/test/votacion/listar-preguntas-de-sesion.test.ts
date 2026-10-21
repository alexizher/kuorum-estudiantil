import { describe, expect, it } from "vitest";
import { ListarPreguntasDeSesion } from "../../src/index.js";
import { crearEscenario, sembrarPregunta, sembrarSesion } from "../dobles/escenario.js";

function caso(e: ReturnType<typeof crearEscenario>) {
  return new ListarPreguntasDeSesion(e.sesiones, e.preguntas, e.votos);
}

describe("ListarPreguntasDeSesion", () => {
  it("devuelve las preguntas de la sesión, borradores incluidos, y no las de otra", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e);
    const otra = await sembrarSesion(e);
    const borrador = await sembrarPregunta(e, sesion.id, "BORRADOR");
    const cerrada = await sembrarPregunta(e, sesion.id, "CERRADA");
    await sembrarPregunta(e, otra.id, "ABIERTA");

    const filas = await caso(e).ejecutar(sesion.id);

    expect(filas.map((f) => f.pregunta.id)).toEqual([borrador.id, cerrada.id]);
  });

  it("falla con SESION_NO_ENCONTRADA si la sesión no existe", async () => {
    const e = crearEscenario();
    await expect(caso(e).ejecutar("nada")).rejects.toMatchObject({
      codigo: "SESION_NO_ENCONTRADA",
    });
  });

  it("solo las cerradas llevan resultado; borrador, abierta y anulada no", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e);
    const borrador = await sembrarPregunta(e, sesion.id, "BORRADOR");
    const abierta = await sembrarPregunta(e, sesion.id, "ABIERTA");
    const anulada = await sembrarPregunta(e, sesion.id, "ANULADA");
    const cerrada = await sembrarPregunta(e, sesion.id, "CERRADA");

    const filas = await caso(e).ejecutar(sesion.id);
    const resultadoDe = (id: string) => filas.find((f) => f.pregunta.id === id)?.resultado;

    expect(resultadoDe(borrador.id)).toBeNull();
    expect(resultadoDe(abierta.id)).toBeNull();
    expect(resultadoDe(anulada.id)).toBeNull();
    expect(resultadoDe(cerrada.id)).toMatchObject({ totalVotos: 0 });
  });
});
