import { describe, expect, it } from "vitest";
import { esquemaEstadoPublicoDeSesion } from "../src/index.js";

const valido = {
  sesionId: "s-1",
  estado: "ABIERTA",
  version: 3,
  actualizadaEn: "2026-10-19T12:00:00.000Z",
};

describe("esquemaEstadoPublicoDeSesion", () => {
  it("acepta un estado válido", () => {
    expect(esquemaEstadoPublicoDeSesion.parse(valido)).toEqual(valido);
  });

  it.each([
    { estado: "DESCONOCIDA" },
    { version: -1 },
    { version: 1.5 },
    { actualizadaEn: "ayer" },
  ])("rechaza %o", (cambio) => {
    expect(esquemaEstadoPublicoDeSesion.safeParse({ ...valido, ...cambio }).success).toBe(false);
  });
});
