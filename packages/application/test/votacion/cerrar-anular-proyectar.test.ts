import { describe, expect, it } from "vitest";
import { AnularPregunta, CerrarPregunta, EmitirVoto, ProyectarResultado } from "../../src/index.js";
import { crearEscenario, opcionDe, sembrarPregunta, sembrarSesion } from "../dobles/escenario.js";
import { superadmin } from "../dobles/actores.js";

async function montar(estadoPregunta: "BORRADOR" | "ABIERTA" | "CERRADA") {
  const e = crearEscenario();
  const sesion = await sembrarSesion(e, { estado: "EN_CURSO" });
  const pregunta = await sembrarPregunta(e, sesion.id, estadoPregunta);
  return { e, sesion, pregunta };
}

describe("CerrarPregunta", () => {
  it("cierra, sube la versión y devuelve el resultado de los conteos", async () => {
    const { e, sesion, pregunta } = await montar("ABIERTA");
    const si = opcionDe(pregunta, 0);
    const no = opcionDe(pregunta, 1);
    await e.votos.emitir(pregunta.id, "p1", si);
    await e.votos.emitir(pregunta.id, "p2", si);
    await e.votos.emitir(pregunta.id, "p3", no);

    const resultado = await new CerrarPregunta(
      e.preguntas,
      e.sesiones,
      e.votos,
      e.reloj,
      e.unidad,
      e.decisiones,
      e.participantes,
      e.ids,
    ).ejecutar(superadmin, pregunta.id);

    expect(pregunta.estado).toBe("CERRADA");
    expect(sesion.version).toBe(1);
    expect(resultado.totalVotos).toBe(3);
    expect(resultado.ganadora).toBe(si);
    expect(resultado.aprobada).toBe(true);
  });

  it("falla si no estaba abierta", async () => {
    const { e, sesion, pregunta } = await montar("BORRADOR");
    await expect(
      new CerrarPregunta(
        e.preguntas,
        e.sesiones,
        e.votos,
        e.reloj,
        e.unidad,
        e.decisiones,
        e.participantes,
        e.ids,
      ).ejecutar(superadmin, pregunta.id),
    ).rejects.toMatchObject({ codigo: "TRANSICION_INVALIDA" });
    expect(sesion.version).toBe(0);
  });
});

describe("AnularPregunta", () => {
  it("anula, sube la versión y oculta el resultado", async () => {
    const { e, sesion, pregunta } = await montar("CERRADA");
    pregunta.proyectarResultado();

    await new AnularPregunta(e.preguntas, e.sesiones, e.unidad, e.decisiones).ejecutar(
      superadmin,
      pregunta.id,
    );

    expect(pregunta.estado).toBe("ANULADA");
    expect(pregunta.resultadoVisible).toBe(false);
    expect(sesion.version).toBe(1);
  });

  it("anular dos veces da TRANSICION_INVALIDA", async () => {
    const { e, pregunta } = await montar("BORRADOR");
    const caso = new AnularPregunta(e.preguntas, e.sesiones, e.unidad, e.decisiones);
    await caso.ejecutar(superadmin, pregunta.id);
    await expect(caso.ejecutar(superadmin, pregunta.id)).rejects.toMatchObject({
      codigo: "TRANSICION_INVALIDA",
    });
  });
});

describe("ProyectarResultado", () => {
  it("marca el resultado visible y sube la versión", async () => {
    const { e, sesion, pregunta } = await montar("CERRADA");
    await new ProyectarResultado(e.preguntas, e.sesiones, e.unidad).ejecutar(
      superadmin,
      pregunta.id,
    );
    expect(pregunta.resultadoVisible).toBe(true);
    expect(sesion.version).toBe(1);
  });

  it("falla con PREGUNTA_NO_CERRADA si sigue abierta", async () => {
    const { e, sesion, pregunta } = await montar("ABIERTA");
    await expect(
      new ProyectarResultado(e.preguntas, e.sesiones, e.unidad).ejecutar(superadmin, pregunta.id),
    ).rejects.toMatchObject({ codigo: "PREGUNTA_NO_CERRADA" });
    expect(sesion.version).toBe(0);
  });
});

describe("EmitirVoto", () => {
  async function votante(e: ReturnType<typeof crearEscenario>, sesionId: string, id = "part-1") {
    await e.participantes.crear({
      id,
      sesionId,
      credencial: "NAVEGADOR",
      hash: `h-${id}`,
      creadoEn: e.reloj.ahora(),
    });
    return id;
  }
  const caso = (e: ReturnType<typeof crearEscenario>) =>
    new EmitirVoto(e.participantes, e.preguntas, e.sesiones, e.votos);

  it("registra el voto sin subir la versión", async () => {
    const { e, sesion, pregunta } = await montar("ABIERTA");
    const id = await votante(e, sesion.id);
    const opcion = opcionDe(pregunta, 0);

    await caso(e).ejecutar(id, pregunta.id, opcion);

    expect((await e.votos.conteos(pregunta.id)).get(opcion)).toBe(1);
    expect(sesion.version).toBe(0);
  });

  it("con la sesión terminada da SESION_NO_EN_CURSO aunque la pregunta siga abierta", async () => {
    const { e, sesion, pregunta } = await montar("ABIERTA");
    const id = await votante(e, sesion.id);
    sesion.terminar();
    await expect(caso(e).ejecutar(id, pregunta.id, opcionDe(pregunta, 0))).rejects.toMatchObject({
      codigo: "SESION_NO_EN_CURSO",
    });
    expect(await e.votos.votosEmitidos(pregunta.id)).toBe(0);
  });

  it("doble voto da YA_VOTO y no cuenta dos veces", async () => {
    const { e, sesion, pregunta } = await montar("ABIERTA");
    const id = await votante(e, sesion.id);
    const opcion = opcionDe(pregunta, 0);
    await caso(e).ejecutar(id, pregunta.id, opcion);

    await expect(caso(e).ejecutar(id, pregunta.id, opcion)).rejects.toMatchObject({
      codigo: "YA_VOTO",
    });
    expect(await e.votos.votosEmitidos(pregunta.id)).toBe(1);
  });

  it("votar en pregunta cerrada da PREGUNTA_CERRADA", async () => {
    const { e, sesion, pregunta } = await montar("CERRADA");
    const id = await votante(e, sesion.id);
    await expect(caso(e).ejecutar(id, pregunta.id, opcionDe(pregunta, 0))).rejects.toMatchObject({
      codigo: "PREGUNTA_CERRADA",
    });
  });

  it("opción de otra pregunta da OPCION_INVALIDA", async () => {
    const { e, sesion, pregunta } = await montar("ABIERTA");
    const otra = await sembrarPregunta(e, sesion.id, "BORRADOR");
    const id = await votante(e, sesion.id);
    await expect(caso(e).ejecutar(id, pregunta.id, opcionDe(otra, 0))).rejects.toMatchObject({
      codigo: "OPCION_INVALIDA",
    });
    expect(await e.votos.votosEmitidos(pregunta.id)).toBe(0);
  });

  it("participante de otra sesión da PARTICIPANTE_AJENO", async () => {
    const { e, pregunta } = await montar("ABIERTA");
    const otraSesion = await sembrarSesion(e, { estado: "EN_CURSO" });
    const id = await votante(e, otraSesion.id);
    await expect(caso(e).ejecutar(id, pregunta.id, opcionDe(pregunta, 0))).rejects.toMatchObject({
      codigo: "PARTICIPANTE_AJENO",
    });
  });

  it("participante inexistente da PARTICIPANTE_AJENO", async () => {
    const { e, pregunta } = await montar("ABIERTA");
    await expect(
      caso(e).ejecutar("fantasma", pregunta.id, opcionDe(pregunta, 0)),
    ).rejects.toMatchObject({ codigo: "PARTICIPANTE_AJENO" });
  });

  it("pregunta inexistente da PREGUNTA_NO_ENCONTRADA", async () => {
    const e = crearEscenario();
    await expect(caso(e).ejecutar("p", "nada", "o")).rejects.toMatchObject({
      codigo: "PREGUNTA_NO_ENCONTRADA",
    });
  });
});
