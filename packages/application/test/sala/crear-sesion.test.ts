import { describe, expect, it } from "vitest";
import { CrearSesion, LIMITE_DE_SESIONES_ACTIVAS_DE_DEMO } from "../../src/index.js";
import { crearEscenario, sembrarSesion } from "../dobles/escenario.js";
import { demo, mesa, otraDemo, superadmin } from "../dobles/actores.js";

function casoDeUso(e: ReturnType<typeof crearEscenario>) {
  return new CrearSesion(e.sesiones, e.unidad, e.ids, e.reloj, e.codigos);
}

describe("CrearSesion", () => {
  it("crea y guarda una sesión programada", async () => {
    const e = crearEscenario();
    const sesion = await casoDeUso(e).ejecutar(superadmin, "Asamblea general", "CON_CODIGOS", 120);

    expect(sesion.estado).toBe("PROGRAMADA");
    expect(sesion.modo).toBe("CON_CODIGOS");
    expect(sesion.segundosPorIntervencion).toBe(120);
    expect(sesion.creadaEn).toEqual(e.reloj.ahora());
    expect(await e.sesiones.porId(sesion.id)).toBe(sesion);
    expect(e.unidad.ejecuciones).toBe(1);
  });

  it("usa los segundos por defecto", async () => {
    const e = crearEscenario();
    const sesion = await casoDeUso(e).ejecutar(superadmin, "Asamblea general", "SALA_ABIERTA");
    expect(sesion.segundosPorIntervencion).toBe(180);
  });

  it("reintenta si el código de sala ya existe", async () => {
    const e = crearEscenario(["AAAA", "AAAA", "BBBB"]);
    const primera = await casoDeUso(e).ejecutar(superadmin, "Primera sesión", "SALA_ABIERTA");
    const segunda = await casoDeUso(e).ejecutar(superadmin, "Segunda sesión", "SALA_ABIERTA");

    expect(primera.codigoDeSala.valor).toBe("AAAA");
    expect(segunda.codigoDeSala.valor).toBe("BBBB");
  });

  it("falla con SIN_CODIGO_DE_SALA_LIBRE tras 5 choques", async () => {
    const e = crearEscenario(["AAAA", "AAAA", "AAAA", "AAAA", "AAAA", "AAAA", "BBBB"]);
    await casoDeUso(e).ejecutar(superadmin, "Primera sesión", "SALA_ABIERTA");

    await expect(
      casoDeUso(e).ejecutar(superadmin, "Segunda sesión", "SALA_ABIERTA"),
    ).rejects.toMatchObject({
      codigo: "SIN_CODIGO_DE_SALA_LIBRE",
    });
    expect(await e.sesiones.listar()).toHaveLength(1);
  });

  it("propaga el error de título inválido", async () => {
    const e = crearEscenario();
    await expect(casoDeUso(e).ejecutar(superadmin, "ab", "SALA_ABIERTA")).rejects.toMatchObject({
      codigo: "TITULO_INVALIDO",
    });
  });

  it("guarda quién la creó", async () => {
    const e = crearEscenario();
    const sesion = await casoDeUso(e).ejecutar(demo, "Prueba de la mesa", "SALA_ABIERTA");
    expect(sesion.creadaPorId).toBe(demo.id);
    expect((await e.sesiones.porId(sesion.id))?.creadaPorId).toBe(demo.id);
  });

  describe("límite de la cuenta de prueba", () => {
    it("permite hasta 5 sesiones activas y rechaza la sexta con LIMITE_DE_DEMO", async () => {
      const e = crearEscenario();
      expect(LIMITE_DE_SESIONES_ACTIVAS_DE_DEMO).toBe(5);
      for (let i = 0; i < 5; i += 1) {
        await sembrarSesion(e, { creadaPorId: demo.id, estado: "EN_CURSO" });
      }
      await expect(
        casoDeUso(e).ejecutar(demo, "Una más de prueba", "SALA_ABIERTA"),
      ).rejects.toMatchObject({ codigo: "LIMITE_DE_DEMO" });
      expect(await e.sesiones.contarActivasDe(demo.id)).toBe(5);
    });

    it("las terminadas no cuentan", async () => {
      const e = crearEscenario();
      for (const estado of ["CERRADA", "ACTA_FINAL", "CANCELADA"] as const) {
        await sembrarSesion(e, { creadaPorId: demo.id, estado });
      }
      for (let i = 0; i < 4; i += 1) await sembrarSesion(e, { creadaPorId: demo.id });
      await expect(
        casoDeUso(e).ejecutar(demo, "La quinta activa", "SALA_ABIERTA"),
      ).resolves.toBeDefined();
    });

    it("el límite es de cada cuenta de prueba y no toca a SUPERADMIN ni MESA", async () => {
      const e = crearEscenario();
      for (let i = 0; i < 5; i += 1) await sembrarSesion(e, { creadaPorId: demo.id });
      await expect(
        casoDeUso(e).ejecutar(otraDemo, "Otra cuenta de prueba", "SALA_ABIERTA"),
      ).resolves.toBeDefined();
      for (let i = 0; i < 7; i += 1) {
        await casoDeUso(e).ejecutar(superadmin, `Sesión de la mesa ${i}`, "SALA_ABIERTA");
        await casoDeUso(e).ejecutar(mesa, `Sesión de la otra mesa ${i}`, "SALA_ABIERTA");
      }
    });
  });
});
