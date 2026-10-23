import { describe, expect, it } from "vitest";
import { CodigoDeVerificacion } from "../../src/index.js";
import { codigoDeError } from "../ayudas.js";

describe("CodigoDeVerificacion", () => {
  it("normaliza mayúsculas, espacios y guiones", () => {
    expect(CodigoDeVerificacion.crear("k7f2a 9qh3b").valor).toBe("K7F2A-9QH3B");
    expect(CodigoDeVerificacion.crear("K7F2A9QH3B").valor).toBe("K7F2A-9QH3B");
    expect(CodigoDeVerificacion.crear(" k7f2a-9qh3b ").valor).toBe("K7F2A-9QH3B");
  });

  it("rechaza largo distinto de 10", () => {
    expect(codigoDeError(() => CodigoDeVerificacion.crear("K7F2A-9QH3"))).toBe(
      "CODIGO_DE_VERIFICACION_INVALIDO",
    );
  });

  it("rechaza caracteres fuera del alfabeto", () => {
    expect(codigoDeError(() => CodigoDeVerificacion.crear("K7F2A-9QH30"))).toBe(
      "CODIGO_DE_VERIFICACION_INVALIDO",
    );
  });
});
