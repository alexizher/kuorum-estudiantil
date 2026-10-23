import { describe, expect, it } from "vitest";
import { aHoraLocal, deHoraLocal } from "../../src/index.js";
import { codigoDeError } from "../ayudas.js";

describe("deHoraLocal y aHoraLocal", () => {
  it("las 23:30 del 3 de noviembre en Bogotá son las 04:30Z del 4", () => {
    const instante = deHoraLocal("2026-11-03T23:30", "America/Bogota");
    expect(instante.toISOString()).toBe("2026-11-04T04:30:00.000Z");
    expect(aHoraLocal(instante, "America/Bogota")).toEqual({ fecha: "2026-11-03", hora: "23:30" });
  });

  it("respeta el horario de verano después del cambio", () => {
    expect(deHoraLocal("2026-03-29T03:30", "Europe/Madrid").toISOString()).toBe(
      "2026-03-29T01:30:00.000Z",
    );
    expect(deHoraLocal("2026-03-28T03:30", "Europe/Madrid").toISOString()).toBe(
      "2026-03-28T02:30:00.000Z",
    );
  });

  it("medianoche local sale como 00:00, no 24:00", () => {
    const instante = deHoraLocal("2026-11-04T00:00", "America/Bogota");
    expect(aHoraLocal(instante, "America/Bogota")).toEqual({ fecha: "2026-11-04", hora: "00:00" });
  });

  it.each(["2026-11-3T9:00", "2026-13-01T10:00", "2026-11-03 10:00", "2026-02-30T10:00", "x"])(
    "rechaza %j con FECHA_INVALIDA",
    (texto) => {
      expect(codigoDeError(() => deHoraLocal(texto, "America/Bogota"))).toBe("FECHA_INVALIDA");
    },
  );
});
