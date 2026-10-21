import { describe, expect, it } from "vitest";
import {
  DarLaPalabra,
  RechazarMocion,
  SumarMinuto,
  TerminarIntervencion,
} from "../../src/index.js";
import { crearEscenario, sembrarSesion } from "../dobles/escenario.js";
import { demo, mesa, superadmin } from "../dobles/actores.js";

async function montar() {
  const e = crearEscenario();
  const propia = await sembrarSesion(e, { creadaPorId: demo.id, estado: "EN_CURSO" });
  const deSuper = await sembrarSesion(e, { creadaPorId: superadmin.id, estado: "EN_CURSO" });
  return { e, propia, deSuper };
}

// Todos cargan la cola con la misma función; cada uno recibe el actor y responde SESION_AJENA
// antes de mirar si hay a quién darle la palabra.
describe("familia palabra: la cuenta de prueba solo toca sus sesiones", () => {
  it("DarLaPalabra", async () => {
    const { e, propia, deSuper } = await montar();
    const caso = new DarLaPalabra(e.sesiones, e.solicitudes, e.reloj, e.unidad);
    await expect(caso.ejecutar(demo, deSuper.id, null)).rejects.toMatchObject({
      codigo: "SESION_AJENA",
    });
    await expect(caso.ejecutar(demo, propia.id, null)).rejects.toMatchObject({
      codigo: "FILA_VACIA",
    });
    await expect(caso.ejecutar(mesa, deSuper.id, null)).rejects.toMatchObject({
      codigo: "FILA_VACIA",
    });
  });

  it("TerminarIntervencion", async () => {
    const { e, propia, deSuper } = await montar();
    const caso = new TerminarIntervencion(e.sesiones, e.solicitudes, e.reloj, e.unidad);
    await expect(caso.ejecutar(demo, deSuper.id)).rejects.toMatchObject({ codigo: "SESION_AJENA" });
    await expect(caso.ejecutar(demo, propia.id)).rejects.not.toMatchObject({
      codigo: "SESION_AJENA",
    });
    await expect(caso.ejecutar(superadmin, deSuper.id)).rejects.not.toMatchObject({
      codigo: "SESION_AJENA",
    });
  });

  it("RechazarMocion", async () => {
    const { e, propia, deSuper } = await montar();
    const caso = new RechazarMocion(e.sesiones, e.solicitudes, e.unidad);
    await expect(caso.ejecutar(demo, deSuper.id, "x")).rejects.toMatchObject({
      codigo: "SESION_AJENA",
    });
    await expect(caso.ejecutar(demo, propia.id, "x")).rejects.not.toMatchObject({
      codigo: "SESION_AJENA",
    });
  });

  it("SumarMinuto", async () => {
    const { e, propia, deSuper } = await montar();
    const caso = new SumarMinuto(e.sesiones, e.solicitudes, e.unidad);
    await expect(caso.ejecutar(demo, deSuper.id)).rejects.toMatchObject({ codigo: "SESION_AJENA" });
    await expect(caso.ejecutar(demo, propia.id)).rejects.not.toMatchObject({
      codigo: "SESION_AJENA",
    });
  });
});
