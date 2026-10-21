import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { CodigoDeSala, ErrorDeDominio, Sesion } from "@kuorum/domain";
import { crearBanco, limpiar, sesionDePrueba, usuarioDePrueba } from "../helpers/sala.js";

const banco = crearBanco();

describe("PrismaRepositorioDeSesiones", () => {
  beforeEach(() => limpiar(banco));
  afterAll(() => banco.prisma.$disconnect());

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
});
