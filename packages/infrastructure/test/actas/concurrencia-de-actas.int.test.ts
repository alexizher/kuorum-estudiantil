import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  Acta,
  CodigoDeVerificacion,
  Decision,
  type ContenidoDeActa,
  type PropiedadesDeDecision,
  type Sesion,
} from "@kuorum/domain";
import {
  EditarActa,
  EditarEnunciado,
  FinalizarActa,
  type Actor,
  type RepositorioDeActas,
} from "@kuorum/application";
import { GeneradorDeCodigosAleatorio } from "../../src/codigos/generador-aleatorio.js";
import { RelojSistema } from "../helpers/reloj.js";
import { crearBanco, limpiar, preguntaDePrueba, sesionDePrueba } from "../helpers/sala.js";

const banco = crearBanco();
const superadmin: Actor = { id: "u-superadmin", rol: "SUPERADMIN", membresias: [] };

const CONTENIDO: ContenidoDeActa = {
  institucion: "Institución",
  cuerpo: "Consejo",
  titulo: "Asamblea general",
  inicio: "2026-10-20T15:00:00.000Z",
  fin: "2026-10-20T17:00:00.000Z",
  zonaHoraria: "America/Bogota",
  modalidad: "PRESENCIAL",
  lugar: null,
  ordenDelDia: [],
  asistentes: null,
  intervenciones: 0,
  mociones: { ORDEN: 0, PROCEDIMIENTO: 0, ACLARACION: 0, SUFICIENTE_ILUSTRACION: 0 },
  desarrollo: "",
  decisiones: [],
};

function propiedadesDe(d: Decision): PropiedadesDeDecision {
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

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Demora cada guardado: abre la ventana en la que otra acción se cruza. */
function actasLentas(ms: number): RepositorioDeActas {
  return {
    deSesion: (id) => banco.actas.deSesion(id),
    porCodigo: (c) => banco.actas.porCodigo(c),
    publicas: (f) => banco.actas.publicas(f),
    guardar: async (acta) => {
      await esperar(ms);
      await banco.actas.guardar(acta);
    },
  };
}

function finalizar(actas: RepositorioDeActas = banco.actas): FinalizarActa {
  return new FinalizarActa(
    banco.sesiones,
    actas,
    banco.cuerpos,
    banco.institucion,
    banco.decisiones,
    banco.preguntas,
    banco.solicitudes,
    banco.participantes,
    new GeneradorDeCodigosAleatorio(),
    new RelojSistema(),
    banco.unidad,
  );
}

async function sesionCerrada(): Promise<Sesion> {
  const sesion = sesionDePrueba({ estado: "CERRADA" });
  await banco.sesiones.guardar(sesion);
  await banco.actas.guardar(Acta.borrador(sesion.id));
  return sesion;
}

async function decisionEn(sesion: Sesion): Promise<Decision> {
  const pregunta = preguntaDePrueba(sesion.id, "CERRADA");
  await banco.preguntas.guardar(pregunta);
  const decision = Decision.reconstruir({
    id: randomUUID(),
    preguntaId: pregunta.id,
    sesionId: sesion.id,
    cuerpoId: sesion.cuerpoId,
    pregunta: pregunta.texto,
    regla: "MAYORIA_SIMPLE",
    resultado: { totalVotos: 0, asistentes: null, porOpcion: [] },
    aprobada: null,
    indicativa: false,
    enunciado: "Enunciado original",
    consultaId: null,
    cerradaEn: new Date("2026-10-20T15:10:00.000Z"),
  });
  await banco.decisiones.guardar(decision);
  return decision;
}

describe("acta y enunciados con acciones simultáneas", () => {
  beforeEach(() => limpiar(banco));
  afterAll(() => banco.prisma.$disconnect());

  it("editar y finalizar a la vez no devuelven el acta a borrador", async () => {
    const sesion = await sesionCerrada();
    const editar = new EditarActa(banco.sesiones, actasLentas(300), banco.unidad);

    const edicion = editar.ejecutar(superadmin, sesion.id, "Texto editado");
    await esperar(50);
    const final = finalizar().ejecutar(superadmin, sesion.id);
    await Promise.allSettled([edicion, final]);

    const acta = await banco.actas.deSesion(sesion.id);
    expect(acta?.estado).toBe("FINAL");
    expect(acta?.contenido?.desarrollo).toBe(acta?.desarrollo);
  });

  it("dos finalizaciones a la vez dejan un solo código y verifica", async () => {
    const sesion = await sesionCerrada();
    const caso = finalizar(actasLentas(200));

    const resultados = await Promise.allSettled([
      caso.ejecutar(superadmin, sesion.id),
      caso.ejecutar(superadmin, sesion.id),
    ]);

    const logrados = resultados.filter((r) => r.status === "fulfilled");
    expect(logrados).toHaveLength(1);
    const fallido = resultados.find((r) => r.status === "rejected");
    expect(fallido?.reason).toMatchObject({ codigo: "ACTA_FINALIZADA" });
    const codigo = logrados[0]?.value;
    if (codigo === undefined) throw new Error("sin código");
    expect((await banco.actas.porCodigo(codigo))?.sesionId).toBe(sesion.id);
  });

  it("un enunciado editado durante la finalización no queda distinto del acta", async () => {
    const sesion = await sesionCerrada();
    const decision = await decisionEn(sesion);
    const enunciado = new EditarEnunciado(banco.decisiones, banco.sesiones, banco.unidad);

    const final = finalizar(actasLentas(300)).ejecutar(superadmin, sesion.id);
    await esperar(100);
    const edicion = enunciado.ejecutar(superadmin, decision.id, "Enunciado nuevo");
    const [, resultado] = await Promise.allSettled([final, edicion]);

    const acta = await banco.actas.deSesion(sesion.id);
    const guardada = await banco.decisiones.porId(decision.id);
    expect(acta?.contenido?.decisiones[0]?.enunciado).toBe(guardada?.enunciado);
    if (resultado.status === "rejected") {
      expect(resultado.reason).toMatchObject({ codigo: "ACTA_FINALIZADA" });
    }
  });
});

describe("violaciones de único entre transacciones", () => {
  beforeEach(() => limpiar(banco));

  it("dos cierres que guardan decisión a la vez: el segundo es DECISION_REPETIDA", async () => {
    const sesion = sesionDePrueba();
    await banco.sesiones.guardar(sesion);
    const pregunta = preguntaDePrueba(sesion.id, "CERRADA");
    await banco.preguntas.guardar(pregunta);
    const base = await decisionEn(sesion);
    await banco.prisma.decision.delete({ where: { id: base.id } });
    const con = (id: string) =>
      Decision.reconstruir({ ...propiedadesDe(base), id, preguntaId: pregunta.id });

    // La primera queda sin confirmar: la segunda no la ve al comprobar y choca al insertar.
    const primera = banco.unidad.ejecutar(async () => {
      await banco.decisiones.guardar(con(randomUUID()));
      await esperar(300);
    });
    await esperar(50);
    const segunda = banco.decisiones.guardar(con(randomUUID()));
    await primera;
    await expect(segunda).rejects.toMatchObject({ codigo: "DECISION_REPETIDA" });
  });

  it("si otro acta toma el mismo código antes de confirmar, se reintenta con otro", async () => {
    const otra = await sesionCerrada();
    const sesion = await sesionCerrada();
    const repetido = "23456-789AB";
    const codigos = [repetido, "23456-789AC"];
    const generador = {
      ...new GeneradorDeCodigosAleatorio(),
      codigoDeSala: () => new GeneradorDeCodigosAleatorio().codigoDeSala(),
      codigoDeAcceso: () => new GeneradorDeCodigosAleatorio().codigoDeAcceso(),
      codigoDeVerificacion: () => CodigoDeVerificacion.crear(codigos.shift() ?? "23456-789AD"),
    };
    const caso = new FinalizarActa(
      banco.sesiones,
      banco.actas,
      banco.cuerpos,
      banco.institucion,
      banco.decisiones,
      banco.preguntas,
      banco.solicitudes,
      banco.participantes,
      generador,
      new RelojSistema(),
      banco.unidad,
    );

    const ocupa = banco.unidad.ejecutar(async () => {
      const acta = Acta.borrador(otra.id);
      acta.finalizar(CONTENIDO, CodigoDeVerificacion.crear(repetido), new Date());
      await banco.actas.guardar(acta);
      await esperar(300);
    });
    await esperar(50);
    const codigo = await caso.ejecutar(superadmin, sesion.id);
    await ocupa;
    expect(codigo.valor).toBe("23456-789AC");
    expect((await banco.actas.porCodigo(codigo))?.sesionId).toBe(sesion.id);
  });
});
