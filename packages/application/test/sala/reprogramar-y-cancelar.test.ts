import { describe, expect, it } from "vitest";
import { CancelarSesion, ReprogramarSesion } from "../../src/index.js";
import {
  CUERPO_INGENIERIA,
  encargadoDeIngenieria,
  encargadoDeMedicina,
  mesaDeIngenieria,
  superadmin,
} from "../dobles/actores.js";
import { crearEscenario, sembrarSesion } from "../dobles/escenario.js";

async function montar() {
  const e = crearEscenario();
  const sesion = await sembrarSesion(e, { cuerpoId: CUERPO_INGENIERIA });
  return {
    e,
    sesion,
    reprogramar: new ReprogramarSesion(e.sesiones, e.institucion, e.unidad),
    cancelar: new CancelarSesion(e.sesiones, e.unidad),
  };
}

describe("ReprogramarSesion", () => {
  it("el encargado cambia el horario en hora local y la versión sube", async () => {
    const { sesion, reprogramar } = await montar();
    await reprogramar.ejecutar(encargadoDeIngenieria, sesion.id, {
      inicioLocal: "2026-11-05T09:00",
      finLocal: "2026-11-05T11:00",
      lugar: null,
    });
    expect(sesion.inicio.toISOString()).toBe("2026-11-05T14:00:00.000Z");
    expect(sesion.fin.toISOString()).toBe("2026-11-05T16:00:00.000Z");
    expect(sesion.version).toBe(1);
  });

  it("la mesa del cuerpo y el encargado de otro reciben SESION_AJENA", async () => {
    const { sesion, reprogramar } = await montar();
    for (const actor of [mesaDeIngenieria, encargadoDeMedicina]) {
      await expect(
        reprogramar.ejecutar(actor, sesion.id, { titulo: "Cambiada" }),
      ).rejects.toMatchObject({ codigo: "SESION_AJENA" });
    }
    expect(sesion.titulo).toBe("Asamblea general");
  });
});

describe("CancelarSesion", () => {
  it("el encargado la cancela", async () => {
    const { sesion, cancelar } = await montar();
    await cancelar.ejecutar(encargadoDeIngenieria, sesion.id);
    expect(sesion.estado).toBe("CANCELADA");
    expect(sesion.version).toBe(1);
  });

  it("la mesa del cuerpo no", async () => {
    const { sesion, cancelar } = await montar();
    await expect(cancelar.ejecutar(mesaDeIngenieria, sesion.id)).rejects.toMatchObject({
      codigo: "SESION_AJENA",
    });
    await expect(cancelar.ejecutar(superadmin, sesion.id)).resolves.toBeUndefined();
  });
});

describe("ReprogramarSesion con orden del día", () => {
  it("cambia el orden del día", async () => {
    const { sesion, reprogramar } = await montar();
    await reprogramar.ejecutar(encargadoDeIngenieria, sesion.id, { ordenDelDia: ["Uno", "Dos"] });
    expect(sesion.ordenDelDia).toEqual(["Uno", "Dos"]);
    expect(sesion.version).toBe(1);
  });
});
