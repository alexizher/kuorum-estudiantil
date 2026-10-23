import { describe, expect, it } from "vitest";
import { ListarCalendario } from "../../src/index.js";
import { CUERPO_ARCHIVADO, CUERPO_INGENIERIA, demo } from "../dobles/actores.js";
import { crearEscenario, sembrarSesion } from "../dobles/escenario.js";

const desde = new Date("2026-11-01T05:00:00Z");
const hasta = new Date("2026-12-01T05:00:00Z");

async function montar() {
  const e = crearEscenario();
  const enIngenieria = await sembrarSesion(e, {
    cuerpoId: CUERPO_INGENIERIA,
    inicio: new Date("2026-11-10T15:00:00Z"),
  });
  const enGeneral = await sembrarSesion(e, { inicio: new Date("2026-11-03T15:00:00Z") });
  const cancelada = await sembrarSesion(e, { inicio: new Date("2026-11-05T15:00:00Z") });
  cancelada.cancelar();
  const deArchivado = await sembrarSesion(e, {
    cuerpoId: CUERPO_ARCHIVADO,
    inicio: new Date("2026-11-07T15:00:00Z"),
  });
  await sembrarSesion(e, { creadaPorId: demo.id, inicio: new Date("2026-11-04T15:00:00Z") });
  await sembrarSesion(e, { inicio: new Date("2026-12-04T15:00:00Z") });
  return {
    e,
    enIngenieria,
    enGeneral,
    cancelada,
    deArchivado,
    caso: new ListarCalendario(e.sesiones, e.cuerpos, e.institucion),
  };
}

describe("ListarCalendario", () => {
  it("lista las del rango por inicio, con canceladas y archivados, sin las de la cuenta de prueba", async () => {
    const { caso, enIngenieria, enGeneral, cancelada, deArchivado } = await montar();
    const calendario = await caso.ejecutar({ desde, hasta });
    expect(calendario.sesiones.map((s) => s.id)).toEqual([
      enGeneral.id,
      cancelada.id,
      deArchivado.id,
      enIngenieria.id,
    ]);
    expect(calendario.sesiones[1]?.estado).toBe("CANCELADA");
    expect(calendario.institucion.zonaHoraria).toBe("America/Bogota");
    expect(calendario.cuerpos.map((c) => c.slug)).toContain("escuela-vieja");
  });

  it("filtra por el slug del cuerpo", async () => {
    const { caso, enIngenieria } = await montar();
    const calendario = await caso.ejecutar({ desde, hasta, cuerpoSlug: "ingenieria" });
    expect(calendario.sesiones.map((s) => s.id)).toEqual([enIngenieria.id]);
    expect(calendario.sesiones[0]?.cuerpo).toEqual({
      id: CUERPO_INGENIERIA,
      nombre: "Ingeniería",
      slug: "ingenieria",
    });
  });

  it("un slug que no existe es CUERPO_NO_EXISTE", async () => {
    const { caso } = await montar();
    await expect(caso.ejecutar({ desde, hasta, cuerpoSlug: "nada" })).rejects.toMatchObject({
      codigo: "CUERPO_NO_EXISTE",
    });
  });

  it("acepta 400 días y rechaza 401 o un rango al revés", async () => {
    const { caso } = await montar();
    const dia = 86_400_000;
    await expect(
      caso.ejecutar({ desde, hasta: new Date(desde.getTime() + 400 * dia) }),
    ).resolves.toBeDefined();
    await expect(
      caso.ejecutar({ desde, hasta: new Date(desde.getTime() + 401 * dia) }),
    ).rejects.toMatchObject({ codigo: "RANGO_INVALIDO" });
    await expect(caso.ejecutar({ desde: hasta, hasta: desde })).rejects.toMatchObject({
      codigo: "RANGO_INVALIDO",
    });
  });
});
