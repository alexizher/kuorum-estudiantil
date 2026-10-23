import { describe, expect, it } from "vitest";
import { BuscarCruces } from "../../src/index.js";
import { CUERPO_MEDICINA, demo, encargadoDeIngenieria, superadmin } from "../dobles/actores.js";
import { crearEscenario, sembrarSesion } from "../dobles/escenario.js";

// 12:00 a 14:00 en Bogotá son 17:00Z a 19:00Z.
async function montar() {
  const e = crearEscenario();
  const existente = await sembrarSesion(e, {
    titulo: "Asamblea de Medicina",
    cuerpoId: CUERPO_MEDICINA,
    inicio: new Date("2026-11-03T17:00:00Z"),
    fin: new Date("2026-11-03T19:00:00Z"),
  });
  return { e, existente, caso: new BuscarCruces(e.sesiones, e.cuerpos, e.institucion) };
}

describe("BuscarCruces", () => {
  it("una sesión que empieza cuando la otra termina no se cruza", async () => {
    const { caso } = await montar();
    expect(
      await caso.ejecutar(encargadoDeIngenieria, {
        inicioLocal: "2026-11-03T14:00",
        finLocal: "2026-11-03T16:00",
      }),
    ).toEqual([]);
  });

  it("una que se monta la devuelve con su cuerpo", async () => {
    const { caso, existente } = await montar();
    const cruces = await caso.ejecutar(encargadoDeIngenieria, {
      inicioLocal: "2026-11-03T13:00",
      finLocal: "2026-11-03T15:00",
    });
    expect(cruces).toHaveLength(1);
    expect(cruces[0]).toMatchObject({
      id: existente.id,
      titulo: "Asamblea de Medicina",
      cuerpo: { id: CUERPO_MEDICINA, nombre: "Medicina", slug: "medicina" },
      estado: "PROGRAMADA",
    });
  });

  it("una cancelada no cuenta", async () => {
    const { caso, existente } = await montar();
    existente.cancelar();
    expect(
      await caso.ejecutar(superadmin, {
        inicioLocal: "2026-11-03T13:00",
        finLocal: "2026-11-03T15:00",
      }),
    ).toEqual([]);
  });

  it("al reprogramar, la sesión no se cruza consigo misma", async () => {
    const { caso, existente } = await montar();
    expect(
      await caso.ejecutar(superadmin, {
        inicioLocal: "2026-11-03T12:30",
        finLocal: "2026-11-03T13:30",
        excluirId: existente.id,
      }),
    ).toEqual([]);
  });

  it("las de la cuenta de prueba solo cuentan para su dueña", async () => {
    const { e, caso } = await montar();
    const deDemo = await sembrarSesion(e, {
      creadaPorId: demo.id,
      inicio: new Date("2026-11-03T21:00:00Z"),
      fin: new Date("2026-11-03T22:00:00Z"),
    });
    const tramo = { inicioLocal: "2026-11-03T16:00", finLocal: "2026-11-03T16:30" };
    expect(await caso.ejecutar(encargadoDeIngenieria, tramo)).toEqual([]);
    expect((await caso.ejecutar(demo, tramo)).map((s) => s.id)).toEqual([deDemo.id]);
  });

  it("con el fin antes del inicio no hay cruces que mostrar", async () => {
    const { caso } = await montar();
    expect(
      await caso.ejecutar(superadmin, {
        inicioLocal: "2026-11-03T15:00",
        finLocal: "2026-11-03T12:00",
      }),
    ).toEqual([]);
  });
});
