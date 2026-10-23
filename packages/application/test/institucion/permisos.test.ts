import { describe, expect, it } from "vitest";
import {
  exigirAdministrador,
  puedeConducir,
  puedeGestionar,
  puedeProgramarEn,
} from "../../src/index.js";
import {
  CUERPO_ARCHIVADO,
  CUERPO_GENERAL,
  CUERPO_INGENIERIA,
  CUERPO_MEDICINA,
  demo,
  encargadoDeIngenieria,
  encargadoDeLaGeneral,
  encargadoDeMedicina,
  mesaDeIngenieria,
  otraDemo,
  sinMembresias,
  superadmin,
} from "../dobles/actores.js";
import { crearEscenario, sembrarSesion } from "../dobles/escenario.js";

async function cuerpo(id: string) {
  const c = await crearEscenario().cuerpos.porId(id);
  if (c === null) throw new Error(id);
  return c;
}

describe("puedeProgramarEn", () => {
  it("SUPERADMIN y DEMO en cualquier cuerpo activo; el encargado solo en el suyo", async () => {
    const ingenieria = await cuerpo(CUERPO_INGENIERIA);
    expect(puedeProgramarEn(superadmin, ingenieria)).toBe(true);
    expect(puedeProgramarEn(demo, ingenieria)).toBe(true);
    expect(puedeProgramarEn(encargadoDeIngenieria, ingenieria)).toBe(true);
    expect(puedeProgramarEn(encargadoDeMedicina, ingenieria)).toBe(false);
    expect(puedeProgramarEn(mesaDeIngenieria, ingenieria)).toBe(false);
    expect(puedeProgramarEn(sinMembresias, ingenieria)).toBe(false);
  });

  it("el encargado de la general no programa en las facultades", async () => {
    expect(puedeProgramarEn(encargadoDeLaGeneral, await cuerpo(CUERPO_MEDICINA))).toBe(false);
    expect(puedeProgramarEn(encargadoDeLaGeneral, await cuerpo(CUERPO_GENERAL))).toBe(true);
  });

  it("nadie programa en un cuerpo archivado", async () => {
    expect(puedeProgramarEn(superadmin, await cuerpo(CUERPO_ARCHIVADO))).toBe(false);
  });
});

describe("puedeConducir y puedeGestionar", () => {
  it("la mesa de Ingeniería conduce pero no gestiona; el encargado hace las dos", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e, { cuerpoId: CUERPO_INGENIERIA });
    expect(puedeConducir(mesaDeIngenieria, sesion)).toBe(true);
    expect(puedeGestionar(mesaDeIngenieria, sesion)).toBe(false);
    expect(puedeConducir(encargadoDeIngenieria, sesion)).toBe(true);
    expect(puedeGestionar(encargadoDeIngenieria, sesion)).toBe(true);
  });

  it("otro cuerpo, ni la general, conduce las de Ingeniería", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e, { cuerpoId: CUERPO_INGENIERIA });
    for (const actor of [encargadoDeMedicina, encargadoDeLaGeneral, sinMembresias]) {
      expect(puedeConducir(actor, sesion)).toBe(false);
      expect(puedeGestionar(actor, sesion)).toBe(false);
    }
  });

  it("la cuenta de prueba solo con lo suyo, y el personal no toca lo de la cuenta de prueba", async () => {
    const e = crearEscenario();
    const deDemo = await sembrarSesion(e, { creadaPorId: demo.id, cuerpoId: CUERPO_INGENIERIA });
    expect(puedeGestionar(demo, deDemo)).toBe(true);
    expect(puedeConducir(otraDemo, deDemo)).toBe(false);
    expect(puedeConducir(encargadoDeIngenieria, deDemo)).toBe(false);
    expect(puedeGestionar(superadmin, deDemo)).toBe(true);
  });
});

describe("exigirAdministrador", () => {
  it("solo deja pasar a SUPERADMIN", () => {
    expect(() => exigirAdministrador(superadmin)).not.toThrow();
    for (const actor of [demo, encargadoDeLaGeneral, mesaDeIngenieria]) {
      expect(() => exigirAdministrador(actor)).toThrowError(
        expect.objectContaining({ codigo: "SOLO_ADMINISTRADOR" }),
      );
    }
  });
});
