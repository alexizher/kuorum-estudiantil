import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { crearBanco, limpiar, sesionDePrueba } from "../helpers/sala.js";

const banco = crearBanco();

describe("PrismaUnidadDeTrabajo", () => {
  beforeEach(() => limpiar(banco));
  afterAll(() => banco.prisma.$disconnect());

  it("confirma todo y devuelve el valor del trabajo", async () => {
    const sesion = sesionDePrueba();
    const valor = await banco.unidad.ejecutar(async () => {
      await banco.sesiones.guardar(sesion);
      await banco.participantes.guardarCodigos(sesion.id, ["a"]);
      return 42;
    });

    expect(valor).toBe(42);
    expect(await banco.prisma.sesion.count()).toBe(1);
    expect(await banco.prisma.codigoDeAcceso.count()).toBe(1);
  });

  it("un error dentro de la unidad no deja escrituras parciales", async () => {
    const sesion = sesionDePrueba({ modo: "CON_CODIGOS" });
    await banco.sesiones.guardar(sesion);

    await expect(
      banco.unidad.ejecutar(async () => {
        await banco.participantes.guardarCodigos(sesion.id, ["a", "b"]);
        await banco.participantes.activarCodigo(sesion.id, "a");
        const cargada = await banco.sesiones.porId(sesion.id);
        cargada?.registrarCambio();
        if (cargada) await banco.sesiones.guardar(cargada);
        throw new Error("falla a mitad de camino");
      }),
    ).rejects.toThrow("falla a mitad de camino");

    expect(await banco.prisma.codigoDeAcceso.count()).toBe(0);
    expect((await banco.sesiones.porId(sesion.id))?.version).toBe(0);
  });

  it("un error de dominio en un repositorio revierte lo anterior de la unidad", async () => {
    const sesion = sesionDePrueba({ modo: "CON_CODIGOS" });
    await banco.sesiones.guardar(sesion);
    await banco.participantes.guardarCodigos(sesion.id, ["a"]);

    await expect(
      banco.unidad.ejecutar(async () => {
        await banco.participantes.activarCodigo(sesion.id, "a");
        await banco.participantes.guardarCodigos(sesion.id, ["a"]);
      }),
    ).rejects.toMatchObject({ codigo: "CODIGO_DUPLICADO" });

    expect(await banco.participantes.contarActivos(sesion.id)).toBe(0);
  });

  it("los repositorios escriben en la transacción: nadie más ve nada hasta confirmar", async () => {
    const sesion = sesionDePrueba();
    let visibleAdentro = -1;
    let visibleAfuera = -1;

    await banco.unidad.ejecutar(async () => {
      await banco.sesiones.guardar(sesion);
      visibleAdentro = (await banco.sesiones.listar()).length;
      visibleAfuera = await banco.prisma.sesion.count();
    });

    expect(visibleAdentro).toBe(1);
    expect(visibleAfuera).toBe(0);
    expect(await banco.prisma.sesion.count()).toBe(1);
  });

  it("una unidad anidada reutiliza la externa: el error de la externa revierte también lo de la interna", async () => {
    const sesion = sesionDePrueba();

    await expect(
      banco.unidad.ejecutar(async () => {
        await banco.unidad.ejecutar(() => banco.sesiones.guardar(sesion));
        throw new Error("falla la externa");
      }),
    ).rejects.toThrow("falla la externa");

    expect(await banco.prisma.sesion.count()).toBe(0);
  });

  it("dos unidades en paralelo no se mezclan", async () => {
    const a = sesionDePrueba();
    const b = sesionDePrueba();

    const resultados = await Promise.allSettled([
      banco.unidad.ejecutar(async () => {
        await banco.sesiones.guardar(a);
      }),
      banco.unidad.ejecutar(async () => {
        await banco.sesiones.guardar(b);
        throw new Error("falla b");
      }),
    ]);

    expect(resultados.map((r) => r.status)).toEqual(["fulfilled", "rejected"]);
    expect((await banco.sesiones.listar()).map((s) => s.id)).toEqual([a.id]);
  });
});
