import { describe, expect, it } from "vitest";
import { ErrorDeDominio, Pregunta, Resultado, type GeneradorDeIds } from "../../src/index.js";

function generadorSecuencial(): GeneradorDeIds {
  let n = 0;
  return { nuevo: () => `id-${++n}` };
}

function preguntaCon(textos: string[]): Pregunta {
  return Pregunta.nueva("s-1", "¿Aprobamos el presupuesto?", textos, generadorSecuencial());
}

function idDe(pregunta: Pregunta, texto: string): string {
  const opcion = pregunta.opciones.find((o) => o.texto === texto);
  if (!opcion) throw new Error(`Sin opción ${texto}`);
  return opcion.id;
}

function codigoDeError(operacion: () => unknown): string {
  try {
    operacion();
  } catch (error) {
    if (error instanceof ErrorDeDominio) return error.codigo;
    throw error;
  }
  throw new Error("La operación no lanzó error");
}

describe("Resultado.calcular", () => {
  it("calcula totales, porcentajes con un decimal, ganadora y aprobación", () => {
    const pregunta = preguntaCon(["Sí", "No", "Me abstengo"]);
    const si = idDe(pregunta, "Sí");
    const no = idDe(pregunta, "No");
    const abstencion = idDe(pregunta, "Me abstengo");

    const resultado = Resultado.calcular(
      pregunta,
      new Map([
        [si, 742],
        [no, 318],
        [abstencion, 96],
      ]),
    );

    expect(resultado.totalVotos).toBe(1156);
    expect(resultado.porOpcion).toEqual([
      { opcionId: si, texto: "Sí", votos: 742, porcentaje: 64.2 },
      { opcionId: no, texto: "No", votos: 318, porcentaje: 27.5 },
      { opcionId: abstencion, texto: "Me abstengo", votos: 96, porcentaje: 8.3 },
    ]);
    expect(resultado.ganadora).toBe(si);
    expect(resultado.aprobada).toBe(true);
  });

  it("da ganadora null en empate por el primer lugar", () => {
    const pregunta = preguntaCon(["Sí", "No", "Me abstengo"]);
    const resultado = Resultado.calcular(
      pregunta,
      new Map([
        [idDe(pregunta, "Sí"), 10],
        [idDe(pregunta, "No"), 10],
        [idDe(pregunta, "Me abstengo"), 2],
      ]),
    );
    expect(resultado.ganadora).toBeNull();
    expect(resultado.aprobada).toBe(false);
  });

  it("con una pregunta sin votos, porcentajes en 0 y ganadora null", () => {
    const pregunta = preguntaCon(["Sí", "No"]);
    const resultado = Resultado.calcular(pregunta, new Map());
    expect(resultado.totalVotos).toBe(0);
    expect(resultado.porOpcion.map((o) => [o.votos, o.porcentaje])).toEqual([
      [0, 0],
      [0, 0],
    ]);
    expect(resultado.ganadora).toBeNull();
  });

  it("aprobada es false cuando No supera a Sí", () => {
    const pregunta = preguntaCon(["Sí", "No"]);
    const resultado = Resultado.calcular(
      pregunta,
      new Map([
        [idDe(pregunta, "Sí"), 3],
        [idDe(pregunta, "No"), 5],
      ]),
    );
    expect(resultado.aprobada).toBe(false);
    expect(resultado.ganadora).toBe(idDe(pregunta, "No"));
  });

  it("reconoce Sí y No sin importar espacios ni mayúsculas, con sí/no acentuados", () => {
    const pregunta = preguntaCon([" SÍ ", "no"]);
    const resultado = Resultado.calcular(
      pregunta,
      new Map([
        [idDe(pregunta, "SÍ"), 4],
        [idDe(pregunta, "no"), 1],
      ]),
    );
    expect(resultado.aprobada).toBe(true);
  });

  it("aprobada es null si las opciones no son exactamente Sí y No", () => {
    const pregunta = preguntaCon(["A favor", "En contra"]);
    const resultado = Resultado.calcular(pregunta, new Map([[idDe(pregunta, "A favor"), 2]]));
    expect(resultado.aprobada).toBeNull();
  });

  it("aprobada es null si hay una tercera opción distinta de Me abstengo", () => {
    const pregunta = preguntaCon(["Sí", "No", "Quizá"]);
    expect(Resultado.calcular(pregunta, new Map()).aprobada).toBeNull();
  });

  it("falla con OPCION_INVALIDA si el conteo trae una opción ajena a la pregunta", () => {
    const pregunta = preguntaCon(["Sí", "No"]);
    expect(codigoDeError(() => Resultado.calcular(pregunta, new Map([["otra", 1]])))).toBe(
      "OPCION_INVALIDA",
    );
  });
});
