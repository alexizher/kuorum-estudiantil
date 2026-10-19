import { describe, expect, it } from "vitest";
import { ErrorDeDominio, InstantaneaDeSesion } from "../../src/index.js";

const fecha = new Date("2026-10-19T12:00:00Z");

describe("InstantaneaDeSesion", () => {
  it("etiqueta() combina sesión y versión", () => {
    const instantanea = new InstantaneaDeSesion("s-1", "EN_CURSO", 7, fecha);
    expect(instantanea.etiqueta()).toBe("s-1-7");
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rechaza la versión %s con VERSION_INVALIDA",
    (version) => {
      const crear = () => new InstantaneaDeSesion("s-1", "PROGRAMADA", version, fecha);
      expect(crear).toThrow(ErrorDeDominio);
      try {
        crear();
      } catch (error) {
        expect((error as ErrorDeDominio).codigo).toBe("VERSION_INVALIDA");
      }
    },
  );

  it("acepta la versión 0", () => {
    expect(new InstantaneaDeSesion("s-1", "PROGRAMADA", 0, fecha).version).toBe(0);
  });
});
