import { describe, expect, it } from "vitest";
import { aWinAnsi, partirEnLineas, textoDeAsistencia } from "../../src/actas/texto-del-pdf";

const medir = (t: string) => t.length * 5;

describe("aWinAnsi", () => {
  it("conserva tildes y eñes y reemplaza lo que no cabe", () => {
    expect(aWinAnsi("Ñandú 🎉")).toBe("Ñandú ?");
  });
  it("conserva los extras de WinAnsi", () => {
    expect(aWinAnsi("€ “a” ‘b’ – — …")).toBe("€ “a” ‘b’ – — …");
  });
  it("reemplaza caracteres fuera de WinAnsi", () => {
    expect(aWinAnsi("日本")).toBe("??");
  });
  it("compone las tildes escritas como letra más marca", () => {
    expect(aWinAnsi("Bogota\u0301 y an\u0303o")).toBe("Bogotá y año");
  });
  it("los saltos de línea quedan como espacio", () => {
    expect(aWinAnsi("uno\ndos\r\ntres")).toBe("uno dos tres");
  });
});

describe("partirEnLineas", () => {
  it("ninguna línea excede el ancho y al unirlas vuelve el texto", () => {
    const texto = "uno dos tres cuatro cinco seis siete ocho nueve diez once doce";
    const lineas = partirEnLineas(texto, 60, medir);
    expect(lineas.length).toBeGreaterThan(1);
    for (const l of lineas) expect(medir(l)).toBeLessThanOrEqual(60);
    expect(lineas.join(" ")).toBe(texto);
  });
  it("corta palabras más largas que la línea", () => {
    const lineas = partirEnLineas("a" + "b".repeat(40) + " fin", 50, medir);
    for (const l of lineas) expect(medir(l)).toBeLessThanOrEqual(50);
    expect(lineas.join("").replace(/ /g, "")).toBe("a" + "b".repeat(40) + "fin");
  });
  it("texto vacío da una línea vacía", () => {
    expect(partirEnLineas("", 50, medir)).toEqual([""]);
  });
});

describe("textoDeAsistencia", () => {
  it("concuerda en número", () => {
    expect(textoDeAsistencia(1)).toBe("Asistencia: 1 código activado");
    expect(textoDeAsistencia(2)).toBe("Asistencia: 2 códigos activados");
    expect(textoDeAsistencia(null)).toBe("Sin registro de asistencia");
  });
});
