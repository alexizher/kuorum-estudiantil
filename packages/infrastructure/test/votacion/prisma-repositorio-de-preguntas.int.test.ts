import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Pregunta } from "@kuorum/domain";
import { PrismaRepositorioDePreguntas } from "../../src/votacion/prisma-repositorio-de-preguntas.js";
import { crearBanco, limpiar, preguntaDePrueba, sesionDePrueba } from "../helpers/sala.js";

const banco = crearBanco();

async function sesionGuardada() {
  const sesion = sesionDePrueba();
  await banco.sesiones.guardar(sesion);
  return sesion;
}

describe("PrismaRepositorioDePreguntas", () => {
  beforeEach(() => limpiar(banco));
  afterAll(() => banco.prisma.$disconnect());

  it("guarda y recupera una pregunta con sus opciones en orden", async () => {
    const sesion = await sesionGuardada();
    const pregunta = preguntaDePrueba(sesion.id, "BORRADOR", ["Sí", "No", "Me abstengo"]);
    await banco.preguntas.guardar(pregunta);

    const leida = await banco.preguntas.porId(pregunta.id);

    expect(leida).toBeInstanceOf(Pregunta);
    expect(leida).toMatchObject({
      id: pregunta.id,
      sesionId: sesion.id,
      texto: pregunta.texto,
      estado: "BORRADOR",
      resultadoVisible: false,
      abiertaEn: null,
      cerradaEn: null,
    });
    expect(leida?.opciones.map((o) => [o.id, o.texto, o.orden])).toEqual(
      pregunta.opciones.map((o) => [o.id, o.texto, o.orden]),
    );
    expect(await banco.preguntas.porId("no-existe")).toBeNull();
  });

  it("guardar de nuevo actualiza estado, fechas y visibilidad sin duplicar opciones", async () => {
    const sesion = await sesionGuardada();
    const pregunta = preguntaDePrueba(sesion.id, "ABIERTA");
    await banco.preguntas.guardar(pregunta);
    const cargada = await banco.preguntas.porId(pregunta.id);
    cargada?.cerrar({ ahora: () => new Date("2026-10-20T16:00:00.000Z") });
    cargada?.proyectarResultado();
    if (cargada) await banco.preguntas.guardar(cargada);

    const final = await banco.preguntas.porId(pregunta.id);
    expect(final).toMatchObject({ estado: "CERRADA", resultadoVisible: true });
    expect(final?.cerradaEn).toEqual(new Date("2026-10-20T16:00:00.000Z"));
    expect(final?.opciones).toHaveLength(3);
    expect(await banco.prisma.opcion.count()).toBe(3);
  });

  it("lista las preguntas de la sesión y encuentra la abierta", async () => {
    const sesion = await sesionGuardada();
    const otra = await sesionGuardada();
    const borrador = preguntaDePrueba(sesion.id);
    const abierta = preguntaDePrueba(sesion.id, "ABIERTA");
    const deOtra = preguntaDePrueba(otra.id, "ABIERTA");
    for (const p of [borrador, abierta, deOtra]) await banco.preguntas.guardar(p);

    expect((await banco.preguntas.deSesion(sesion.id)).map((p) => p.id).sort()).toEqual(
      [borrador.id, abierta.id].sort(),
    );
    expect((await banco.preguntas.abiertaDeSesion(sesion.id))?.id).toBe(abierta.id);
    expect(await banco.preguntas.abiertaDeSesion("no-existe")).toBeNull();
  });

  it("al guardarla ABIERTA crea un conteo en 0 por opción", async () => {
    const sesion = await sesionGuardada();
    const pregunta = preguntaDePrueba(sesion.id, "ABIERTA");
    await banco.preguntas.guardar(pregunta);

    expect(await banco.votos.conteos(pregunta.id)).toEqual(
      new Map(pregunta.opciones.map((o) => [o.id, 0])),
    );
  });

  it("crea una fila de conteo por opción", async () => {
    const sesion = await sesionGuardada();
    const pregunta = preguntaDePrueba(sesion.id, "ABIERTA");
    await banco.preguntas.guardar(pregunta);
    expect(await banco.prisma.conteo.count()).toBe(pregunta.opciones.length);
  });

  it("un borrador no tiene conteos todavía", async () => {
    const sesion = await sesionGuardada();
    const pregunta = preguntaDePrueba(sesion.id);
    await banco.preguntas.guardar(pregunta);
    expect((await banco.votos.conteos(pregunta.id)).size).toBe(0);
  });

  it("guardar ABIERTA dos veces no reinicia los conteos", async () => {
    const sesion = await sesionGuardada();
    const pregunta = preguntaDePrueba(sesion.id, "ABIERTA");
    await banco.preguntas.guardar(pregunta);
    const [primera] = pregunta.opciones;
    await banco.prisma.conteo.updateMany({
      where: { opcionId: primera?.id ?? "" },
      data: { total: 4 },
    });

    await banco.preguntas.guardar(pregunta);

    expect((await banco.votos.conteos(pregunta.id)).get(primera?.id ?? "")).toBe(4);
  });

  it("una segunda ABIERTA en la misma sesión falla con OTRA_PREGUNTA_ABIERTA", async () => {
    const sesion = await sesionGuardada();
    await banco.preguntas.guardar(preguntaDePrueba(sesion.id, "ABIERTA"));
    const segunda = preguntaDePrueba(sesion.id);
    await banco.preguntas.guardar(segunda);
    const cargada = await banco.preguntas.porId(segunda.id);
    cargada?.abrir({ ahora: () => new Date() });

    await expect(
      cargada ? banco.preguntas.guardar(cargada) : Promise.resolve(),
    ).rejects.toMatchObject({
      codigo: "OTRA_PREGUNTA_ABIERTA",
    });
    expect((await banco.preguntas.porId(segunda.id))?.estado).toBe("BORRADOR");
  });

  it("dos aperturas simultáneas de preguntas distintas: exactamente una triunfa", async () => {
    const sesion = await sesionGuardada();
    const a = preguntaDePrueba(sesion.id, "ABIERTA");
    const b = preguntaDePrueba(sesion.id, "ABIERTA");

    const resultados = await Promise.allSettled([
      banco.unidad.ejecutar(() => banco.preguntas.guardar(a)),
      banco.unidad.ejecutar(() => banco.preguntas.guardar(b)),
    ]);

    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rechazo = resultados.find((r) => r.status === "rejected");
    expect(rechazo?.status === "rejected" && rechazo.reason).toMatchObject({
      codigo: "OTRA_PREGUNTA_ABIERTA",
    });
    expect(await banco.prisma.pregunta.count({ where: { estado: "ABIERTA" } })).toBe(1);
  });

  it("cerrar una y abrir otra después sí se puede", async () => {
    const sesion = await sesionGuardada();
    const primera = preguntaDePrueba(sesion.id, "ABIERTA");
    await banco.preguntas.guardar(primera);
    await banco.preguntas.guardar(preguntaDePrueba(sesion.id, "CERRADA"));
    await banco.preguntas.guardar(preguntaDePrueba(sesion.id, "ANULADA"));
    const cerrada = await banco.preguntas.porId(primera.id);
    cerrada?.cerrar({ ahora: () => new Date() });
    if (cerrada) await banco.preguntas.guardar(cerrada);

    await banco.preguntas.guardar(preguntaDePrueba(sesion.id, "ABIERTA"));

    expect(await banco.prisma.pregunta.count({ where: { estado: "ABIERTA" } })).toBe(1);
  });
});

describe("cierre con votos en vuelo", () => {
  const pausa = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

  it("si no consigue el candado tras los reintentos falla con CIERRE_OCUPADO y no cambia nada", async () => {
    const rapido = new PrismaRepositorioDePreguntas(banco.contexto, {
      esperaDeCandadoMs: 100,
      intentosDeCierre: 3,
    });
    const sesion = await sesionGuardada();
    const pregunta = preguntaDePrueba(sesion.id, "ABIERTA");
    await banco.preguntas.guardar(pregunta);
    const cargada = await rapido.porId(pregunta.id);
    cargada?.cerrar({ ahora: () => new Date() });

    // Un voto "colgado" que retiene FOR SHARE más que tres esperas.
    const ocupando = banco.unidad.ejecutar(async () => {
      await banco.votos.emitir(pregunta.id, "p1", pregunta.opciones[0]?.id ?? "");
      await pausa(800);
    });
    await pausa(150);
    const inicio = Date.now();
    await expect(cargada ? rapido.guardar(cargada) : Promise.resolve()).rejects.toMatchObject({
      codigo: "CIERRE_OCUPADO",
      message: "Hay votos entrando, intenta cerrar de nuevo en unos segundos",
    });
    expect(Date.now() - inicio).toBeGreaterThanOrEqual(280);
    await ocupando;
    expect((await banco.preguntas.porId(pregunta.id))?.estado).toBe("ABIERTA");

    await rapido.guardar(cargada ?? pregunta);
    expect((await banco.preguntas.porId(pregunta.id))?.estado).toBe("CERRADA");
  });
});
