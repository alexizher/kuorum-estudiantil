import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { CodigoDeSala, ErrorDeDominio, Sesion } from "@kuorum/domain";
import { crearBanco, limpiar, sesionDePrueba } from "../helpers/sala.js";

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

  it("un dato inválido en la base lanza en vez de repararse", async () => {
    const sesion = sesionDePrueba();
    await banco.sesiones.guardar(sesion);
    await banco.prisma.sesion.update({ where: { id: sesion.id }, data: { titulo: "x" } });

    await expect(banco.sesiones.porId(sesion.id)).rejects.toMatchObject({
      codigo: "TITULO_INVALIDO",
    });
    await expect(banco.sesiones.porId(sesion.id)).rejects.toBeInstanceOf(ErrorDeDominio);
  });
});
