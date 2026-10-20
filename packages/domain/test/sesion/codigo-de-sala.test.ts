import { describe, expect, it } from "vitest";
import { CodigoDeSala, ErrorDeDominio } from "../../src/index.js";

function codigoDeError(operacion: () => unknown): string {
  try {
    operacion();
  } catch (error) {
    if (error instanceof ErrorDeDominio) return error.codigo;
    throw error;
  }
  throw new Error("La operación no lanzó error");
}

describe("CodigoDeSala", () => {
  it.each([
    ["K7F2", "K7F2"],
    ["k7f2", "K7F2"],
    ["Z9QH", "Z9QH"],
  ])("acepta %s y lo guarda como %s", (entrada, esperado) => {
    expect(CodigoDeSala.crear(entrada).valor).toBe(esperado);
  });

  it.each([
    ["K0F2", "cero"],
    ["K1F2", "uno"],
    ["KIF2", "I"],
    ["KLF2", "L"],
    ["KOF2", "O"],
    ["K7F", "muy corto"],
    ["K7F22", "muy largo"],
    ["K7F-", "guion"],
    ["K7F!", "símbolo"],
    ["", "vacío"],
  ])("rechaza %s (%s) con CODIGO_DE_SALA_INVALIDO", (entrada) => {
    expect(codigoDeError(() => CodigoDeSala.crear(entrada))).toBe("CODIGO_DE_SALA_INVALIDO");
  });
});
