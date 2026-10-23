import { describe, expect, it } from "vitest";
import {
  AnularPregunta,
  CerrarPregunta,
  EditarEnunciado,
  ListarDecisionesPublicas,
} from "../../src/index.js";
import { crearEscenario, opcionDe, sembrarPregunta, sembrarSesion } from "../dobles/escenario.js";
import { CUERPO_INGENIERIA, demo, encargadoDeMedicina, superadmin } from "../dobles/actores.js";

type E = ReturnType<typeof crearEscenario>;

const cerrar = (e: E) =>
  new CerrarPregunta(
    e.preguntas,
    e.sesiones,
    e.votos,
    e.reloj,
    e.unidad,
    e.decisiones,
    e.participantes,
    e.ids,
  );

async function montar(modo: "SALA_ABIERTA" | "CON_CODIGOS" = "SALA_ABIERTA", creadaPorId?: string) {
  const e = crearEscenario();
  const sesion = await sembrarSesion(e, {
    estado: "EN_CURSO",
    modo,
    cuerpoId: CUERPO_INGENIERIA,
    ...(creadaPorId === undefined ? {} : { creadaPorId }),
  });
  const pregunta = await sembrarPregunta(e, sesion.id, "ABIERTA");
  return { e, sesion, pregunta };
}

describe("CerrarPregunta registra la decisión", () => {
  it("en CON_CODIGOS guarda la asistencia y la foto del resultado", async () => {
    const { e, sesion, pregunta } = await montar("CON_CODIGOS");
    await e.participantes.guardarCodigos(sesion.id, ["a", "b", "c", "d"]);
    await e.participantes.activarCodigo(sesion.id, "a");
    await e.participantes.activarCodigo(sesion.id, "b");
    await e.participantes.activarCodigo(sesion.id, "c");
    await e.votos.emitir(pregunta.id, "p1", opcionDe(pregunta, 0));
    await e.votos.emitir(pregunta.id, "p2", opcionDe(pregunta, 0));

    await cerrar(e).ejecutar(superadmin, pregunta.id);

    const [decision, ...resto] = await e.decisiones.deSesion(sesion.id);
    expect(resto).toHaveLength(0);
    expect(decision?.preguntaId).toBe(pregunta.id);
    expect(decision?.cuerpoId).toBe(CUERPO_INGENIERIA);
    expect(decision?.resultado.asistentes).toBe(3);
    expect(decision?.resultado.totalVotos).toBe(2);
    expect(decision?.aprobada).toBe(true);
    expect(decision?.indicativa).toBe(false);
    expect(decision?.cerradaEn).toEqual(e.reloj.ahora());
  });

  it("en SALA_ABIERTA la asistencia es null y la decisión es indicativa", async () => {
    const { e, sesion, pregunta } = await montar("SALA_ABIERTA");
    await cerrar(e).ejecutar(superadmin, pregunta.id);
    const [decision] = await e.decisiones.deSesion(sesion.id);
    expect(decision?.resultado.asistentes).toBeNull();
    expect(decision?.indicativa).toBe(true);
  });

  it("dos cierres de la misma pregunta dejan una sola decisión", async () => {
    const { e, sesion, pregunta } = await montar();
    await cerrar(e).ejecutar(superadmin, pregunta.id);
    await expect(cerrar(e).ejecutar(superadmin, pregunta.id)).rejects.toMatchObject({
      codigo: "TRANSICION_INVALIDA",
    });
    expect(await e.decisiones.deSesion(sesion.id)).toHaveLength(1);
  });

  it("si el repositorio dice DECISION_REPETIDA, el error sube", async () => {
    const { e, pregunta } = await montar();
    e.decisiones.guardar = async () => {
      const { ErrorDeDominio } = await import("@kuorum/domain");
      throw new ErrorDeDominio("DECISION_REPETIDA");
    };
    await expect(cerrar(e).ejecutar(superadmin, pregunta.id)).rejects.toMatchObject({
      codigo: "DECISION_REPETIDA",
    });
  });

  it("anular una votación cerrada borra su decisión", async () => {
    const { e, sesion, pregunta } = await montar();
    await cerrar(e).ejecutar(superadmin, pregunta.id);
    await new AnularPregunta(e.preguntas, e.sesiones, e.unidad, e.decisiones).ejecutar(
      superadmin,
      pregunta.id,
    );
    expect(await e.decisiones.deSesion(sesion.id)).toHaveLength(0);
  });

  it("anular una pregunta abierta no crea decisión", async () => {
    const { e, sesion, pregunta } = await montar();
    await new AnularPregunta(e.preguntas, e.sesiones, e.unidad, e.decisiones).ejecutar(
      superadmin,
      pregunta.id,
    );
    expect(await e.decisiones.deSesion(sesion.id)).toHaveLength(0);
  });
});

async function idDeLaDecision(e: E, sesionId: string): Promise<string> {
  const [decision] = await e.decisiones.deSesion(sesionId);
  if (decision === undefined) throw new Error("Sin decisión");
  return decision.id;
}

describe("EditarEnunciado", () => {
  it("quien conduce cambia el enunciado y puede borrarlo", async () => {
    const { e, sesion, pregunta } = await montar();
    await cerrar(e).ejecutar(superadmin, pregunta.id);
    const id = await idDeLaDecision(e, sesion.id);
    const caso = new EditarEnunciado(e.decisiones, e.sesiones, e.unidad);

    await caso.ejecutar(superadmin, id, "  Se aprueba el acta anterior.  ");
    expect((await e.decisiones.porId(id))?.enunciado).toBe("Se aprueba el acta anterior.");
    await caso.ejecutar(superadmin, id, null);
    expect((await e.decisiones.porId(id))?.enunciado).toBeNull();
  });

  it("con el acta final da ACTA_FINALIZADA y no cambia; lo ajeno sigue siendo 404", async () => {
    const { e, sesion, pregunta } = await montar();
    await cerrar(e).ejecutar(superadmin, pregunta.id);
    const id = await idDeLaDecision(e, sesion.id);
    sesion.terminar();
    sesion.finalizarActa();
    const caso = new EditarEnunciado(e.decisiones, e.sesiones, e.unidad);
    await expect(caso.ejecutar(superadmin, id, "Tarde")).rejects.toMatchObject({
      codigo: "ACTA_FINALIZADA",
    });
    await expect(caso.ejecutar(encargadoDeMedicina, id, "Tarde")).rejects.toMatchObject({
      codigo: "DECISION_NO_ENCONTRADA",
    });
    expect((await e.decisiones.porId(id))?.enunciado).toBeNull();
  });

  it("una decisión ajena o inexistente da DECISION_NO_ENCONTRADA", async () => {
    const { e, sesion, pregunta } = await montar();
    await cerrar(e).ejecutar(superadmin, pregunta.id);
    const id = await idDeLaDecision(e, sesion.id);
    const caso = new EditarEnunciado(e.decisiones, e.sesiones, e.unidad);
    for (const actor of [encargadoDeMedicina, demo]) {
      await expect(caso.ejecutar(actor, id, "Otra cosa")).rejects.toMatchObject({
        codigo: "DECISION_NO_ENCONTRADA",
      });
    }
    await expect(caso.ejecutar(superadmin, "nada", "x")).rejects.toMatchObject({
      codigo: "DECISION_NO_ENCONTRADA",
    });
    expect((await e.decisiones.porId(id))?.enunciado).toBeNull();
  });
});

describe("ListarDecisionesPublicas", () => {
  const rango = {
    desde: new Date("2026-10-01T00:00:00Z"),
    hasta: new Date("2026-11-01T00:00:00Z"),
  };

  async function conDecision(estadoFinal: "ACTA_FINAL" | "CERRADA", creadaPorId?: string) {
    const m = await montar("SALA_ABIERTA", creadaPorId);
    await cerrar(m.e).ejecutar(superadmin, m.pregunta.id);
    m.sesion.terminar();
    if (estadoFinal === "ACTA_FINAL") m.sesion.finalizarActa();
    return m;
  }

  it("lista las de sesiones con acta final, filtrando por cuerpo", async () => {
    const { e } = await conDecision("ACTA_FINAL");
    const caso = new ListarDecisionesPublicas(e.decisiones, e.cuerpos);
    expect(await caso.ejecutar(rango)).toHaveLength(1);
    expect(await caso.ejecutar({ ...rango, cuerpoSlug: "ingenieria" })).toHaveLength(1);
    expect(await caso.ejecutar({ ...rango, cuerpoSlug: "medicina" })).toHaveLength(0);
  });

  it("excluye las no finalizadas y las de la cuenta de prueba", async () => {
    const noFinal = await conDecision("CERRADA");
    expect(
      await new ListarDecisionesPublicas(noFinal.e.decisiones, noFinal.e.cuerpos).ejecutar(rango),
    ).toHaveLength(0);
    const deDemo = await conDecision("ACTA_FINAL", demo.id);
    expect(
      await new ListarDecisionesPublicas(deDemo.e.decisiones, deDemo.e.cuerpos).ejecutar(rango),
    ).toHaveLength(0);
  });

  it("valida el rango y el cuerpo", async () => {
    const e = crearEscenario();
    const caso = new ListarDecisionesPublicas(e.decisiones, e.cuerpos);
    await expect(caso.ejecutar({ desde: rango.hasta, hasta: rango.desde })).rejects.toMatchObject({
      codigo: "RANGO_INVALIDO",
    });
    await expect(
      caso.ejecutar({ desde: new Date("2020-01-01T00:00:00Z"), hasta: rango.hasta }),
    ).rejects.toMatchObject({ codigo: "RANGO_INVALIDO" });
    await expect(caso.ejecutar({ ...rango, cuerpoSlug: "no-existe" })).rejects.toMatchObject({
      codigo: "CUERPO_NO_EXISTE",
    });
  });
});
