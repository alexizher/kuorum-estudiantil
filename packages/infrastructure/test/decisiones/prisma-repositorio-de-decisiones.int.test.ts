import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { Decision, ErrorDeDominio, type Sesion } from "@kuorum/domain";
import {
  crearBanco,
  cuerpoDePrueba,
  limpiar,
  preguntaDePrueba,
  sesionDePrueba,
  usuarioDePrueba,
} from "../helpers/sala.js";

const banco = crearBanco();

async function decisionEn(sesion: Sesion, cerradaEn: Date): Promise<Decision> {
  const pregunta = preguntaDePrueba(sesion.id, "CERRADA");
  await banco.preguntas.guardar(pregunta);
  return Decision.reconstruir({
    id: randomUUID(),
    preguntaId: pregunta.id,
    sesionId: sesion.id,
    cuerpoId: sesion.cuerpoId,
    pregunta: pregunta.texto,
    regla: "MAYORIA_SIMPLE",
    resultado: {
      totalVotos: 3,
      asistentes: 5,
      porOpcion: [
        { texto: "Sí", votos: 2, porcentaje: 66.7 },
        { texto: "No", votos: 1, porcentaje: 33.3 },
      ],
    },
    aprobada: true,
    indicativa: false,
    enunciado: "Se aprueba el acta anterior.",
    consultaId: null,
    cerradaEn,
  });
}

describe("PrismaRepositorioDeDecisiones", () => {
  beforeEach(() => limpiar(banco));
  afterAll(() => banco.prisma.$disconnect());

  it("guarda la decisión con su foto de resultado y la lee por id y por sesión", async () => {
    const sesion = sesionDePrueba();
    await banco.sesiones.guardar(sesion);
    const decision = await decisionEn(sesion, new Date("2026-10-20T15:10:00.000Z"));
    await banco.decisiones.guardar(decision);

    const leida = await banco.decisiones.porId(decision.id);
    expect(leida).toBeInstanceOf(Decision);
    expect(leida).toMatchObject({
      preguntaId: decision.preguntaId,
      enunciado: "Se aprueba el acta anterior.",
      aprobada: true,
      resultado: decision.resultado,
      cerradaEn: decision.cerradaEn,
    });
    expect((await banco.decisiones.deSesion(sesion.id)).map((d) => d.id)).toEqual([decision.id]);
    expect(await banco.decisiones.porId(randomUUID())).toBeNull();
  });

  it("elimina la decisión de una pregunta y no falla si no hay", async () => {
    const sesion = sesionDePrueba();
    await banco.sesiones.guardar(sesion);
    const decision = await decisionEn(sesion, new Date());
    const otra = await decisionEn(sesion, new Date());
    await banco.decisiones.guardar(decision);
    await banco.decisiones.guardar(otra);
    await banco.decisiones.eliminarDePregunta(decision.preguntaId);
    await banco.decisiones.eliminarDePregunta(decision.preguntaId);
    expect((await banco.decisiones.deSesion(sesion.id)).map((d) => d.id)).toEqual([otra.id]);
  });

  it("guarda de nuevo el enunciado editado", async () => {
    const sesion = sesionDePrueba();
    await banco.sesiones.guardar(sesion);
    const decision = await decisionEn(sesion, new Date());
    await banco.decisiones.guardar(decision);
    const leida = await banco.decisiones.porId(decision.id);
    leida?.cambiarEnunciado("Texto nuevo");
    if (leida) await banco.decisiones.guardar(leida);
    expect((await banco.decisiones.porId(decision.id))?.enunciado).toBe("Texto nuevo");
  });

  it("lanza DECISION_REPETIDA si la pregunta ya tiene decisión, sin abortar la transacción", async () => {
    const sesion = sesionDePrueba();
    await banco.sesiones.guardar(sesion);
    const decision = await decisionEn(sesion, new Date());
    await banco.decisiones.guardar(decision);
    const otra = Decision.reconstruir({ ...propiedades(decision), id: randomUUID() });

    await banco.unidad.ejecutar(async () => {
      await expect(banco.decisiones.guardar(otra)).rejects.toMatchObject({
        constructor: ErrorDeDominio,
        codigo: "DECISION_REPETIDA",
      });
      expect(await banco.decisiones.deSesion(sesion.id)).toHaveLength(1);
    });
  });

  it("publicas solo trae las de sesiones con acta final, por cuerpo, rango y sin DEMO", async () => {
    const facultad = await cuerpoDePrueba(banco, "Facultad de prueba");
    const demo = await usuarioDePrueba(banco, "DEMO");
    const final = sesionDePrueba({ estado: "ACTA_FINAL" });
    const deFacultad = sesionDePrueba({ estado: "ACTA_FINAL", cuerpoId: facultad });
    const cerrada = sesionDePrueba({ estado: "CERRADA" });
    const deDemo = sesionDePrueba({ estado: "ACTA_FINAL", creadaPorId: demo });
    for (const s of [final, deFacultad, cerrada, deDemo]) await banco.sesiones.guardar(s);
    const dia = new Date("2026-10-20T15:10:00.000Z");
    const d1 = await decisionEn(final, dia);
    const d2 = await decisionEn(deFacultad, new Date("2026-10-21T15:10:00.000Z"));
    const fuera = await decisionEn(final, new Date("2026-11-20T15:10:00.000Z"));
    for (const d of [
      d1,
      d2,
      fuera,
      await decisionEn(cerrada, dia),
      await decisionEn(deDemo, dia),
    ]) {
      await banco.decisiones.guardar(d);
    }
    const rango = {
      desde: new Date("2026-10-01T00:00:00Z"),
      hasta: new Date("2026-11-01T00:00:00Z"),
    };

    const todas = await banco.decisiones.publicas(rango);
    expect(todas.map((d) => d.id)).toEqual([d1.id, d2.id]);
    const soloFacultad = await banco.decisiones.publicas({ ...rango, cuerpoId: facultad });
    expect(soloFacultad.map((d) => d.id)).toEqual([d2.id]);
  });

  it("borrar la sesión borra sus decisiones", async () => {
    const sesion = sesionDePrueba();
    await banco.sesiones.guardar(sesion);
    const decision = await decisionEn(sesion, new Date());
    await banco.decisiones.guardar(decision);
    await banco.prisma.sesion.delete({ where: { id: sesion.id } });
    expect(await banco.decisiones.porId(decision.id)).toBeNull();
  });
});

function propiedades(d: Decision) {
  return {
    id: d.id,
    preguntaId: d.preguntaId,
    sesionId: d.sesionId,
    cuerpoId: d.cuerpoId,
    pregunta: d.pregunta,
    regla: d.regla,
    resultado: d.resultado,
    aprobada: d.aprobada,
    indicativa: d.indicativa,
    enunciado: d.enunciado,
    consultaId: d.consultaId,
    cerradaEn: d.cerradaEn,
  };
}
