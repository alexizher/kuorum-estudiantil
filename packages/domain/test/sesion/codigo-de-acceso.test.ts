import { describe, expect, it } from "vitest";
import { CodigoDeAcceso, ErrorDeDominio } from "../../src/index.js";

function codigoDeError(operacion: () => unknown): string {
  try {
    operacion();
  } catch (error) {
    if (error instanceof ErrorDeDominio) return error.codigo;
    throw error;
  }
  throw new Error("La operación no lanzó error");
}

describe("CodigoDeAcceso", () => {
  it.each([
    ["K7F2-9QH3", "K7F2-9QH3"],
    ["k7f2-9qh3", "K7F2-9QH3"],
    ["K7F29QH3", "K7F2-9QH3"],
    ["k7f29qh3", "K7F2-9QH3"],
  ])("acepta %s y lo normaliza a %s", (entrada, esperado) => {
    expect(CodigoDeAcceso.crear(entrada).valor).toBe(esperado);
  });

  it.each([
    ["K7F2-9QH", "muy corto"],
    ["K7F2-9QH30", "muy largo"],
    ["K0F2-9QH3", "cero"],
    ["K7F2-9QI3", "I"],
    ["K7F-29QH3", "guion en otra posición"],
    ["K7F2-9QH3-", "guion final"],
    ["K7F2_9QH3", "guion bajo"],
    ["K7F2 9QH3", "espacio"],
    ["", "vacío"],
  ])("rechaza %s (%s) con CODIGO_DE_ACCESO_INVALIDO", (entrada) => {
    expect(codigoDeError(() => CodigoDeAcceso.crear(entrada))).toBe("CODIGO_DE_ACCESO_INVALIDO");
  });
});
