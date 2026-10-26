import { describe, expect, it } from "vitest";
import { escribirCodigo, rutaDeSala } from "@/portada/codigo-de-sala";

describe("escribirCodigo", () => {
  it("pasa a mayúsculas", () => {
    expect(escribirCodigo("k7f2")).toEqual({ valor: "K7F2", huboRechazados: false });
  });

  it.each(["0", "1", "I", "L", "O", "i", "l", "o", "!", "ñ", "é"])(
    "rechaza %s, que no está en el alfabeto",
    (caracter) => {
      expect(escribirCodigo(`K${caracter}7`)).toEqual({ valor: "K7", huboRechazados: true });
    },
  );

  it("corta en 4 caracteres sin marcar rechazo", () => {
    expect(escribirCodigo("ABCDEFG")).toEqual({ valor: "ABCD", huboRechazados: false });
  });

  it("ignora espacios y guiones que vienen al pegar", () => {
    expect(escribirCodigo(" k7-f2 ")).toEqual({ valor: "K7F2", huboRechazados: false });
  });

  it("vacío es vacío", () => {
    expect(escribirCodigo("")).toEqual({ valor: "", huboRechazados: false });
  });
});

describe("rutaDeSala", () => {
  it("lleva a /s/{codigo}", () => {
    expect(rutaDeSala("K7F2")).toBe("/s/K7F2");
  });
});
