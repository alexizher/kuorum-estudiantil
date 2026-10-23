import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { CodigoDeSala, ErrorDeDominio, Sesion } from "@kuorum/domain";
import {
  CUERPO_GENERAL,
  crearBanco,
  cuerpoDePrueba,
  limpiar,
  sesionDePrueba,
  usuarioDePrueba,
} from "../helpers/sala.js";

const banco = crearBanco();

describe("PrismaRepositorioDeSesiones", () => {
  beforeEach(() => limpiar(banco));
  afterAll(() => banco.prisma.$disconnect());

  it("guarda y recupera el orden del día, y lo actualiza al reprogramar", async () => {
    const sesion = sesionDePrueba({ estado: "PROGRAMADA", ordenDelDia: ["Saludo", "Informe"] });
    await banco.sesiones.guardar(sesion);
    const leida = await banco.sesiones.porId(sesion.id);
    expect(leida?.ordenDelDia).toEqual(["Saludo", "Informe"]);
    leida?.reprogramar({ ordenDelDia: ["Solo uno"] });
    if (leida) await banco.sesiones.guardar(leida);
    expect((await banco.sesiones.porId(sesion.id))?.ordenDelDia).toEqual(["Solo uno"]);
  });

  it("guarda y recupera una sesión por id, por código de sala y en el listado", async () => {
    const sesion = sesionDePrueba({ modo: "CON_CODIGOS", estado: "PROGRAMADA" });
    await banco.sesiones.guardar(sesion);

    const porId = await banco.sesiones.porId(sesion.id);
    expect(porId).toBeInstanceOf(Sesion);
    expect(porId).toMatchObject({
      id: sesion.id,
      titulo: "Asamblea general",
      modo: "CON_CODIGOS",
      estado: "PROGRAMADA",
      segundosPorIntervencion: 180,
      version: 0,
    });
    expect(porId?.codigoDeSala.valor).toBe(sesion.codigoDeSala.valor);

    const porCodigo = await banco.sesiones.porCodigoDeSala(
      CodigoDeSala.crear(sesion.codigoDeSala.valor),
    );
    expect(porCodigo?.id).toBe(sesion.id);
    expect((await banco.sesiones.listar()).map((s) => s.id)).toEqual([sesion.id]);
  });

  it("devuelve null si no existe", async () => {
    expect(await banco.sesiones.porId("no-existe")).toBeNull();
    expect(await banco.sesiones.porCodigoDeSala(CodigoDeSala.crear("ABCD"))).toBeNull();
  });

  it("guardar de nuevo actualiza estado y versión", async () => {
    const sesion = sesionDePrueba({ estado: "PROGRAMADA" });
    await banco.sesiones.guardar(sesion);
    const cargada = await banco.sesiones.porId(sesion.id);
    cargada?.iniciar();
    cargada?.registrarCambio();
    if (cargada) await banco.sesiones.guardar(cargada);

    const final = await banco.sesiones.porId(sesion.id);
    expect(final?.estado).toBe("EN_CURSO");
    expect(final?.version).toBe(1);
  });

  it("dos cambios concurrentes de la misma versión suman 2, no 1 (el ETag no puede repetirse)", async () => {
    const sesion = sesionDePrueba();
    await banco.sesiones.guardar(sesion);
    const a = await banco.sesiones.porId(sesion.id);
    const b = await banco.sesiones.porId(sesion.id);
    a?.registrarCambio();
    b?.registrarCambio();
    if (!a || !b) throw new Error("sesión no cargada");

    await Promise.all([banco.sesiones.guardar(a), banco.sesiones.guardar(b)]);

    expect((await banco.sesiones.porId(sesion.id))?.version).toBe(2);
  });

  it("guardar una instancia que no vino del repositorio y ya existe falla con SESION_NO_CARGADA", async () => {
    const sesion = sesionDePrueba();
    await banco.sesiones.guardar(sesion);
    const copia = Sesion.reconstruir({
      id: sesion.id,
      titulo: sesion.titulo,
      codigoDeSala: sesion.codigoDeSala,
      modo: sesion.modo,
      estado: sesion.estado,
      segundosPorIntervencion: sesion.segundosPorIntervencion,
      version: 1,
      creadaEn: sesion.creadaEn,
      cuerpoId: sesion.cuerpoId,
      inicio: sesion.inicio,
      fin: sesion.fin,
      modalidad: sesion.modalidad,
    });

    await expect(banco.sesiones.guardar(copia)).rejects.toMatchObject({
      codigo: "SESION_NO_CARGADA",
    });
    expect((await banco.sesiones.porId(sesion.id))?.version).toBe(0);
  });

  it("SESION_NO_CARGADA dentro de una unidad de trabajo no aborta la transacción", async () => {
    const sesion = sesionDePrueba();
    await banco.sesiones.guardar(sesion);
    const copia = Sesion.reconstruir({
      id: sesion.id,
      titulo: sesion.titulo,
      codigoDeSala: sesion.codigoDeSala,
      modo: sesion.modo,
      estado: sesion.estado,
      segundosPorIntervencion: sesion.segundosPorIntervencion,
      version: 1,
      creadaEn: sesion.creadaEn,
      cuerpoId: sesion.cuerpoId,
      inicio: sesion.inicio,
      fin: sesion.fin,
      modalidad: sesion.modalidad,
    });

    const despues = await banco.unidad.ejecutar(async () => {
      await expect(banco.sesiones.guardar(copia)).rejects.toMatchObject({
        codigo: "SESION_NO_CARGADA",
      });
      return banco.sesiones.porId(sesion.id);
    });

    expect(despues?.id).toBe(sesion.id);
  });

  it("un dato inválido en la base lanza en vez de repararse", async () => {
    const sesion = sesionDePrueba();
    await banco.sesiones.guardar(sesion);
    await banco.prisma.sesion.update({ where: { id: sesion.id }, data: { titulo: "x" } });

    await expect(banco.sesiones.porId(sesion.id)).rejects.toMatchObject({
      codigo: "TITULO_INVALIDO",
    });
    await expect(banco.sesiones.porId(sesion.id)).rejects.toBeInstanceOf(ErrorDeDominio);
  });

  it("guarda quién creó la sesión y lo devuelve al leerla", async () => {
    const autor = await usuarioDePrueba(banco, "DEMO");
    const sesion = sesionDePrueba({ creadaPorId: autor });
    await banco.sesiones.guardar(sesion);
    const sinAutor = sesionDePrueba();
    await banco.sesiones.guardar(sinAutor);

    expect((await banco.sesiones.porId(sesion.id))?.creadaPorId).toBe(autor);
    expect((await banco.sesiones.porId(sinAutor.id))?.creadaPorId).toBeNull();
  });

  it("listar con filtro devuelve solo las del creador", async () => {
    const demo = await usuarioDePrueba(banco, "DEMO");
    const jefe = await usuarioDePrueba(banco, "SUPERADMIN");
    const propia = sesionDePrueba({ creadaPorId: demo });
    const ajena = sesionDePrueba({ creadaPorId: jefe });
    await banco.sesiones.guardar(propia);
    await banco.sesiones.guardar(ajena);

    expect((await banco.sesiones.listar({ creadaPorId: demo })).map((s) => s.id)).toEqual([
      propia.id,
    ]);
    expect(await banco.sesiones.listar({})).toHaveLength(2);
    expect(await banco.sesiones.listar({ creadaPorId: "nadie" })).toEqual([]);
  });

  it("contarActivasDe ignora las cerradas, con acta final y canceladas, y las de otros", async () => {
    const demo = await usuarioDePrueba(banco, "DEMO");
    const jefe = await usuarioDePrueba(banco, "SUPERADMIN");
    for (const estado of [
      "PROGRAMADA",
      "ABIERTA",
      "EN_CURSO",
      "CERRADA",
      "ACTA_FINAL",
      "CANCELADA",
    ] as const) {
      await banco.sesiones.guardar(sesionDePrueba({ creadaPorId: demo, estado }));
    }
    await banco.sesiones.guardar(sesionDePrueba({ creadaPorId: jefe, estado: "EN_CURSO" }));

    expect(await banco.sesiones.contarActivasDe(demo)).toBe(3);
    expect(await banco.sesiones.contarActivasDe(jefe)).toBe(1);
    expect(await banco.sesiones.contarActivasDe("nadie")).toBe(0);
  });

  it("si se borra al usuario, la sesión queda sin dueño en vez de borrarse", async () => {
    const autor = await usuarioDePrueba(banco, "MESA");
    const sesion = sesionDePrueba({ creadaPorId: autor });
    await banco.sesiones.guardar(sesion);

    await banco.prisma.user.delete({ where: { id: autor } });

    expect((await banco.sesiones.porId(sesion.id))?.creadaPorId).toBeNull();
  });

  it("sinCuentaDePrueba deja fuera lo de cuentas DEMO y conserva lo de las demás y lo sin dueño", async () => {
    const demo = await usuarioDePrueba(banco, "DEMO");
    const jefe = await usuarioDePrueba(banco, "SUPERADMIN");
    const mesa = await usuarioDePrueba(banco, "MESA");
    const deDemo = sesionDePrueba({ creadaPorId: demo });
    const deJefe = sesionDePrueba({ creadaPorId: jefe });
    const deMesa = sesionDePrueba({ creadaPorId: mesa });
    const sinDueno = sesionDePrueba();
    for (const s of [deDemo, deJefe, deMesa, sinDueno]) await banco.sesiones.guardar(s);

    const visibles = (await banco.sesiones.listar({ sinCuentaDePrueba: true })).map((s) => s.id);
    expect(visibles.sort()).toEqual([deJefe.id, deMesa.id, sinDueno.id].sort());
    expect(await banco.sesiones.listar({})).toHaveLength(4);
  });

  it("contarDe cuenta todas las del creador, en cualquier estado", async () => {
    const demo = await usuarioDePrueba(banco, "DEMO");
    for (const estado of ["PROGRAMADA", "CERRADA", "CANCELADA"] as const) {
      await banco.sesiones.guardar(sesionDePrueba({ creadaPorId: demo, estado }));
    }
    expect(await banco.sesiones.contarDe(demo)).toBe(3);
    expect(await banco.sesiones.contarDe("nadie")).toBe(0);
  });

  it("guarda y lee horario, cuerpo, modalidad, lugar y reprogramación", async () => {
    const medicina = await cuerpoDePrueba(banco, "Medicina");
    const sesion = sesionDePrueba({
      estado: "PROGRAMADA",
      cuerpoId: medicina,
      inicio: new Date("2026-11-03T19:00:00.000Z"),
      fin: new Date("2026-11-03T21:00:00.000Z"),
      lugar: "Auditorio",
    });
    await banco.sesiones.guardar(sesion);
    const cargada = await banco.sesiones.porId(sesion.id);
    expect(cargada).toMatchObject({
      cuerpoId: medicina,
      modalidad: "PRESENCIAL",
      lugar: "Auditorio",
    });
    expect(cargada?.inicio.toISOString()).toBe("2026-11-03T19:00:00.000Z");
    expect(cargada?.fin.toISOString()).toBe("2026-11-03T21:00:00.000Z");

    cargada?.reprogramar({
      inicio: new Date("2026-11-04T19:00:00.000Z"),
      fin: new Date("2026-11-04T20:00:00.000Z"),
      modalidad: "VIRTUAL",
      lugar: null,
      titulo: "Asamblea movida",
    });
    if (cargada) await banco.sesiones.guardar(cargada);
    const movida = await banco.sesiones.porId(sesion.id);
    expect(movida).toMatchObject({ titulo: "Asamblea movida", modalidad: "VIRTUAL", lugar: null });
    expect(movida?.fin.toISOString()).toBe("2026-11-04T20:00:00.000Z");
  });

  it("marca creadaPorDemo según el rol del creador", async () => {
    const demo = await usuarioDePrueba(banco, "DEMO");
    const jefe = await usuarioDePrueba(banco, "SUPERADMIN");
    const deDemo = sesionDePrueba({ creadaPorId: demo });
    const deJefe = sesionDePrueba({ creadaPorId: jefe });
    await banco.sesiones.guardar(deDemo);
    await banco.sesiones.guardar(deJefe);
    expect((await banco.sesiones.porId(deDemo.id))?.creadaPorDemo).toBe(true);
    expect((await banco.sesiones.porId(deJefe.id))?.creadaPorDemo).toBe(false);
    expect((await banco.sesiones.listar()).find((s) => s.id === deDemo.id)?.creadaPorDemo).toBe(
      true,
    );
  });

  it("listar filtra por cuerpos", async () => {
    const medicina = await cuerpoDePrueba(banco, "Medicina");
    const enMedicina = sesionDePrueba({ cuerpoId: medicina });
    const enGeneral = sesionDePrueba();
    await banco.sesiones.guardar(enMedicina);
    await banco.sesiones.guardar(enGeneral);
    expect((await banco.sesiones.listar({ cuerpoIds: [medicina] })).map((s) => s.id)).toEqual([
      enMedicina.id,
    ]);
    expect(await banco.sesiones.listar({ cuerpoIds: [] })).toEqual([]);
    expect((await banco.sesiones.listar({ cuerpoIds: [medicina, CUERPO_GENERAL] })).length).toBe(2);
  });

  it("enRango devuelve las que se cruzan, por inicio, sin las de cuentas DEMO salvo incluirDe", async () => {
    const demo = await usuarioDePrueba(banco, "DEMO");
    const medicina = await cuerpoDePrueba(banco, "Medicina");
    const hora = (h: number) => new Date(Date.UTC(2026, 10, 3, h));
    const tarde = sesionDePrueba({ inicio: hora(16), fin: hora(18) });
    const manana = sesionDePrueba({ inicio: hora(9), fin: hora(11), cuerpoId: medicina });
    const justoAntes = sesionDePrueba({ inicio: hora(6), fin: hora(8) });
    const cancelada = sesionDePrueba({ inicio: hora(10), fin: hora(12), estado: "CANCELADA" });
    const deDemo = sesionDePrueba({ inicio: hora(12), fin: hora(13), creadaPorId: demo });
    for (const s of [tarde, manana, justoAntes, cancelada, deDemo]) await banco.sesiones.guardar(s);

    const ids = async (filtro = {}) =>
      (await banco.sesiones.enRango(hora(8), hora(17), filtro)).map((s) => s.id);
    expect(await ids()).toEqual([manana.id, cancelada.id, tarde.id]);
    expect(await ids({ sinCanceladas: true })).toEqual([manana.id, tarde.id]);
    expect(await ids({ cuerpoId: medicina })).toEqual([manana.id]);
    expect(await ids({ incluirDe: demo, sinCanceladas: true })).toEqual([
      manana.id,
      deDemo.id,
      tarde.id,
    ]);
  });

  it("no se puede borrar un cuerpo con sesiones", async () => {
    const medicina = await cuerpoDePrueba(banco, "Medicina");
    await banco.sesiones.guardar(sesionDePrueba({ cuerpoId: medicina }));
    await expect(banco.prisma.cuerpo.delete({ where: { id: medicina } })).rejects.toThrow();
  });
});
