import { describe, expect, it } from "vitest";
import { generarIcs, type SesionDelCalendario } from "../../src/calendario/ics";

const base: SesionDelCalendario = {
  id: "s1",
  titulo: "Asamblea",
  cuerpo: { nombre: "Asamblea general", slug: "asamblea-general" },
  inicio: new Date("2026-11-04T04:30:00Z"),
  fin: new Date("2026-11-04T06:30:00Z"),
  modalidad: "PRESENCIAL",
  lugar: null,
  estado: "PROGRAMADA",
};

function ics(sesiones: SesionDelCalendario[], cuerpo?: string) {
  return generarIcs({
    institucion: "Universidad de Ejemplo",
    ...(cuerpo === undefined ? {} : { cuerpo }),
    host: "kuorum.example",
    generadoEn: new Date("2026-10-22T12:00:00Z"),
    sesiones,
  });
}

/** Une las líneas plegadas como lo haría un cliente de calendario. */
const desplegar = (texto: string) => texto.replace(/\r\n /g, "");

describe("generarIcs", () => {
  it("arma el calendario con un evento por sesión, en UTC y con CRLF", () => {
    const texto = ics([base]);
    expect(
      texto.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Kuorum Estudiantil//ES\r\n"),
    ).toBe(true);
    expect(texto.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(texto).toContain("X-WR-CALNAME:Universidad de Ejemplo\r\n");
    expect(texto).toContain(
      "BEGIN:VEVENT\r\nUID:s1@kuorum.example\r\nDTSTAMP:20261022T120000Z\r\n",
    );
    expect(texto).toContain("DTSTART:20261104T043000Z\r\nDTEND:20261104T063000Z\r\n");
    expect(texto).toContain("SUMMARY:Asamblea (Asamblea general)\r\n");
    expect(texto).not.toContain("LOCATION");
    expect(texto).not.toContain("STATUS");
    expect(texto.split("\r\n").every((linea) => !linea.includes("\n"))).toBe(true);
  });

  it("pone el cuerpo en el nombre del calendario si se filtró", () => {
    expect(ics([], "Artes")).toContain("X-WR-CALNAME:Universidad de Ejemplo: Artes\r\n");
  });

  it("lugar y cancelada", () => {
    const texto = ics([{ ...base, lugar: "Auditorio 10", estado: "CANCELADA" }]);
    expect(texto).toContain("LOCATION:Auditorio 10\r\n");
    expect(texto).toContain("STATUS:CANCELLED\r\n");
  });

  it("escapa coma, punto y coma, barra y saltos de línea", () => {
    const texto = desplegar(ics([{ ...base, titulo: "Paro; votación, sí\\no\nsegunda línea" }]));
    expect(texto).toContain(
      "SUMMARY:Paro\\; votación\\, sí\\\\no\\nsegunda línea (Asamblea general)",
    );
  });

  it("pliega a 75 octetos sin partir caracteres y al desplegar vuelve el texto", () => {
    const titulo =
      "Asamblea; paro, y\nvotación de la Facultad de Ingeniería y Ciencias Exactas, con tildes: áéíóú ñ";
    const texto = ics([{ ...base, titulo }]);
    const codificador = new TextEncoder();
    for (const linea of texto.split("\r\n")) {
      expect(codificador.encode(linea).length).toBeLessThanOrEqual(75);
      expect(linea.includes("�")).toBe(false);
    }
    expect(desplegar(texto)).toContain(
      "SUMMARY:Asamblea\\; paro\\, y\\nvotación de la Facultad de Ingeniería y Ciencias Exactas\\, con tildes: áéíóú ñ (Asamblea general)",
    );
  });

  it("no parte una í que cae justo en el borde", () => {
    // "SUMMARY:" son 8 octetos; 66 letras más dejan la í (2 octetos) en los octetos 75 y 76.
    const titulo = `${"a".repeat(66)}íb`;
    const lineas = ics([{ ...base, titulo }]).split("\r\n");
    const indice = lineas.findIndex((l) => l.startsWith("SUMMARY:"));
    expect(lineas[indice]).toBe(`SUMMARY:${"a".repeat(66)}`);
    expect(lineas[indice + 1]?.startsWith(" íb")).toBe(true);
  });
});
