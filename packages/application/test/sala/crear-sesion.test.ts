import { describe, expect, it } from "vitest";
import { CrearSesion } from "../../src/index.js";
import { crearEscenario } from "../dobles/escenario.js";

function casoDeUso(e: ReturnType<typeof crearEscenario>) {
  return new CrearSesion(e.sesiones, e.unidad, e.ids, e.reloj, e.codigos);
}

describe("CrearSesion", () => {
  it("crea y guarda una sesión programada", async () => {
    const e = crearEscenario();
    const sesion = await casoDeUso(e).ejecutar("Asamblea general", "CON_CODIGOS", 120);

    expect(sesion.estado).toBe("PROGRAMADA");
    expect(sesion.modo).toBe("CON_CODIGOS");
    expect(sesion.segundosPorIntervencion).toBe(120);
    expect(sesion.creadaEn).toEqual(e.reloj.ahora());
    expect(await e.sesiones.porId(sesion.id)).toBe(sesion);
    expect(e.unidad.ejecuciones).toBe(1);
  });

  it("usa los segundos por defecto", async () => {
    const e = crearEscenario();
    const sesion = await casoDeUso(e).ejecutar("Asamblea general", "SALA_ABIERTA");
    expect(sesion.segundosPorIntervencion).toBe(180);
  });

  it("reintenta si el código de sala ya existe", async () => {
    const e = crearEscenario(["AAAA", "AAAA", "BBBB"]);
    const primera = await casoDeUso(e).ejecutar("Primera sesión", "SALA_ABIERTA");
    const segunda = await casoDeUso(e).ejecutar("Segunda sesión", "SALA_ABIERTA");

    expect(primera.codigoDeSala.valor).toBe("AAAA");
    expect(segunda.codigoDeSala.valor).toBe("BBBB");
  });

  it("falla con SIN_CODIGO_DE_SALA_LIBRE tras 5 choques", async () => {
    const e = crearEscenario(["AAAA", "AAAA", "AAAA", "AAAA", "AAAA", "AAAA", "BBBB"]);
    await casoDeUso(e).ejecutar("Primera sesión", "SALA_ABIERTA");

    await expect(casoDeUso(e).ejecutar("Segunda sesión", "SALA_ABIERTA")).rejects.toMatchObject({
      codigo: "SIN_CODIGO_DE_SALA_LIBRE",
    });
    expect(await e.sesiones.listar()).toHaveLength(1);
  });

  it("propaga el error de título inválido", async () => {
    const e = crearEscenario();
    await expect(casoDeUso(e).ejecutar("ab", "SALA_ABIERTA")).rejects.toMatchObject({
      codigo: "TITULO_INVALIDO",
    });
  });
});
