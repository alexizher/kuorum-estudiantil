import { describe, expect, it } from "vitest";
import {
  CodigoDeAcceso,
  CodigoDeSala,
  Decision,
  Pregunta,
  Resultado,
  Sesion,
  type GeneradorDeCodigos,
  type GeneradorDeIds,
  CodigoDeVerificacion,
} from "../../src/index.js";
import { codigoDeError } from "../ayudas.js";

const generador: GeneradorDeCodigos = {
  codigoDeSala: () => CodigoDeSala.crear("K7F2"),
  codigoDeAcceso: () => CodigoDeAcceso.crear("K7F2-9QH3"),
  codigoDeVerificacion: () => CodigoDeVerificacion.crear("K7F2A9QH3B"),
};
let n = 0;
const ids: GeneradorDeIds = { nuevo: () => `id-${(n += 1)}` };

function sesion(modo: "CON_CODIGOS" | "SALA_ABIERTA"): Sesion {
  return Sesion.nueva(
    {
      id: "s-1",
      titulo: "Asamblea",
      modo,
      cuerpoId: "c-general",
      inicio: new Date("2026-11-03T19:00:00Z"),
      fin: new Date("2026-11-03T21:00:00Z"),
      modalidad: "PRESENCIAL",
      creadaEn: new Date("2026-10-19T12:00:00Z"),
    },
    generador,
  );
}

function preparar(modo: "CON_CODIGOS" | "SALA_ABIERTA") {
  const pregunta = Pregunta.nueva(
    "s-1",
    "¿Aprobamos el presupuesto?",
    ["Sí", "No", "Me abstengo"],
    ids,
  );
  const ids2 = pregunta.opciones.map((o) => o.id);
  const si = ids2[0] ?? "";
  const no = ids2[1] ?? "";
  const resultado = Resultado.calcular(
    pregunta,
    new Map([
      [si, 2],
      [no, 1],
    ]),
  );
  const cerradaEn = new Date("2026-11-03T20:00:00Z");
  return Decision.desdeResultado({
    id: "d-1",
    pregunta,
    sesion: sesion(modo),
    resultado,
    asistentes: 10,
    cerradaEn,
  });
}

describe("Decision", () => {
  it("copia el resultado con porcentajes", () => {
    const d = preparar("CON_CODIGOS");
    expect(d.preguntaId).toBeDefined();
    expect(d.sesionId).toBe("s-1");
    expect(d.cuerpoId).toBe("c-general");
    expect(d.regla).toBe("MAYORIA_SIMPLE");
    expect(d.aprobada).toBe(true);
    expect(d.resultado.totalVotos).toBe(3);
    expect(d.resultado.asistentes).toBe(10);
    expect(d.resultado.porOpcion).toEqual([
      { texto: "Sí", votos: 2, porcentaje: 66.7 },
      { texto: "No", votos: 1, porcentaje: 33.3 },
      { texto: "Me abstengo", votos: 0, porcentaje: 0 },
    ]);
    expect(d.enunciado).toBeNull();
    expect(d.consultaId).toBeNull();
    expect(d.indicativa).toBe(false);
  });

  it("marca indicativa en sala abierta", () => {
    expect(preparar("SALA_ABIERTA").indicativa).toBe(true);
  });

  it("cambia el enunciado, vacío es null", () => {
    const d = preparar("CON_CODIGOS");
    d.cambiarEnunciado("  Se aprueba  ");
    expect(d.enunciado).toBe("Se aprueba");
    d.cambiarEnunciado("   ");
    expect(d.enunciado).toBeNull();
  });

  it("rechaza un enunciado de 1.001 caracteres", () => {
    const d = preparar("CON_CODIGOS");
    expect(codigoDeError(() => d.cambiarEnunciado("a".repeat(1_001)))).toBe("ENUNCIADO_INVALIDO");
    d.cambiarEnunciado("a".repeat(1_000));
  });
});
