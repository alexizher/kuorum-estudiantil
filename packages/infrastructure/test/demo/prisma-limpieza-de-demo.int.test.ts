import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { LimpiarSesionesDeDemo } from "@kuorum/application";
import {
  crearBanco,
  limpiar,
  participanteDePrueba,
  preguntaDePrueba,
  sesionDePrueba,
  usuarioDePrueba,
  type Banco,
} from "../helpers/sala.js";

const banco = crearBanco();

/** Una sesión con todo lo que puede colgar de ella. */
async function sesionCompleta(b: Banco, creadaPorId: string) {
  const sesion = sesionDePrueba({ creadaPorId, modo: "CON_CODIGOS" });
  await b.sesiones.guardar(sesion);
  await b.participantes.guardarCodigos(sesion.id, ["h-codigo"]);
  const participante = participanteDePrueba(sesion.id);
  await b.participantes.crear(participante);
  const pregunta = preguntaDePrueba(sesion.id, "ABIERTA");
  await b.preguntas.guardar(pregunta);
  const opcion = pregunta.opciones[0];
  if (opcion === undefined) throw new Error("La pregunta no tiene opciones");
  await b.votos.emitir(pregunta.id, participante.id, opcion.id);
  await b.prisma.solicitudDePalabra.create({
    data: {
      id: `sol-${sesion.id}`,
      sesionId: sesion.id,
      participanteId: participante.id,
      nombreVisible: "Ana",
      tipo: "INTERVENCION",
      pedidaEn: new Date("2026-10-20T15:02:00.000Z"),
    },
  });
  return sesion;
}

async function contarTodo(b: Banco) {
  const [sesiones, participantes, codigos, preguntas, opciones, conteos, votos, solicitudes] =
    await Promise.all([
      b.prisma.sesion.count(),
      b.prisma.participante.count(),
      b.prisma.codigoDeAcceso.count(),
      b.prisma.pregunta.count(),
      b.prisma.opcion.count(),
      b.prisma.conteo.count(),
      b.prisma.votoEmitido.count(),
      b.prisma.solicitudDePalabra.count(),
    ]);
  return { sesiones, participantes, codigos, preguntas, opciones, conteos, votos, solicitudes };
}

describe("LimpiarSesionesDeDemo (Postgres)", () => {
  beforeEach(() => limpiar(banco));
  afterAll(() => banco.prisma.$disconnect());

  it("borra todo lo de las sesiones de la cuenta de prueba y deja intacto lo demás", async () => {
    const demo = await usuarioDePrueba(banco, "DEMO");
    const otraDemo = await usuarioDePrueba(banco, "DEMO");
    const jefe = await usuarioDePrueba(banco, "SUPERADMIN");
    const mesa = await usuarioDePrueba(banco, "MESA");
    const deDemo = await sesionCompleta(banco, demo);
    const deOtraDemo = await sesionCompleta(banco, otraDemo);
    const deJefe = await sesionCompleta(banco, jefe);
    const deMesa = await sesionCompleta(banco, mesa);
    const sinDueno = sesionDePrueba();
    await banco.sesiones.guardar(sinDueno);
    const antes = await contarTodo(banco);
    expect(antes.sesiones).toBe(5);

    const borradas = await new LimpiarSesionesDeDemo(banco.limpieza, banco.unidad).ejecutar();

    expect(borradas).toBe(2);
    const quedan = (await banco.prisma.sesion.findMany()).map((s) => s.id).sort();
    expect(quedan).toEqual([deJefe.id, deMesa.id, sinDueno.id].sort());
    expect(quedan).not.toContain(deDemo.id);
    expect(quedan).not.toContain(deOtraDemo.id);
    // Tres sesiones de las cuatro completas conservan todas sus filas; ninguna fila huérfana.
    const despues = await contarTodo(banco);
    expect(despues).toEqual({
      sesiones: 3,
      participantes: 2,
      codigos: 2,
      preguntas: 2,
      opciones: 6,
      conteos: 6,
      votos: 2,
      solicitudes: 2,
    });
    // Los usuarios no se tocan.
    expect(
      await banco.prisma.user.count({ where: { id: { in: [demo, otraDemo, jefe, mesa] } } }),
    ).toBe(4);
  });

  it("sin sesiones de la cuenta de prueba no borra nada", async () => {
    const jefe = await usuarioDePrueba(banco, "SUPERADMIN");
    await sesionCompleta(banco, jefe);
    const antes = await contarTodo(banco);

    expect(await new LimpiarSesionesDeDemo(banco.limpieza, banco.unidad).ejecutar()).toBe(0);
    expect(await contarTodo(banco)).toEqual(antes);
  });

  it("es una sola transacción: si falla a mitad, no queda nada borrado", async () => {
    const demo = await usuarioDePrueba(banco, "DEMO");
    await sesionCompleta(banco, demo);
    await sesionCompleta(banco, demo);
    const antes = await contarTodo(banco);

    await expect(
      banco.unidad.ejecutar(async () => {
        await banco.limpieza.eliminarSesionesDeLaCuentaDePrueba();
        throw new Error("falla después de borrar");
      }),
    ).rejects.toThrow("falla después de borrar");

    expect(await contarTodo(banco)).toEqual(antes);
  });
});
