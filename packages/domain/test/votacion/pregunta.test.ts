import { describe, expect, it } from "vitest";
import {
  ErrorDeDominio,
  OPCIONES_SI_NO_ABSTENCION,
  Pregunta,
  type GeneradorDeIds,
  type Reloj,
} from "../../src/index.js";

const ahora = new Date("2026-10-19T12:30:00Z");
const reloj: Reloj = { ahora: () => ahora };

const TEXTO = "¿Aprobamos el presupuesto de 2027?";

function generadorSecuencial(): GeneradorDeIds {
  let n = 0;
  return { nuevo: () => `id-${++n}` };
}

function nuevaSiNo(): Pregunta {
  return Pregunta.nueva("s-1", TEXTO, ["Sí", "No"], generadorSecuencial());
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

describe("Pregunta.nueva", () => {
  it("nace en BORRADOR, secreta, sin tiempos y sin resultado visible", () => {
    const pregunta = nuevaSiNo();
    expect(pregunta.sesionId).toBe("s-1");
    expect(pregunta.texto).toBe(TEXTO);
    expect(pregunta.estado).toBe("BORRADOR");
    expect(pregunta.secreta).toBe(true);
    expect(pregunta.abiertaEn).toBeNull();
    expect(pregunta.cerradaEn).toBeNull();
    expect(pregunta.resultadoVisible).toBe(false);
  });

  it("asigna id a la pregunta y a cada opción, con orden según la lista recibida", () => {
    const pregunta = nuevaSiNo();
    expect(pregunta.id).toBe("id-1");
    expect(pregunta.opciones.map((o) => [o.id, o.texto, o.orden])).toEqual([
      ["id-2", "Sí", 0],
      ["id-3", "No", 1],
    ]);
  });

  it("quita espacios del texto de la pregunta y de las opciones", () => {
    const pregunta = Pregunta.nueva(
      "s-1",
      "   ¿Aprobamos el presupuesto?   ",
      ["  Sí ", " No"],
      generadorSecuencial(),
    );
    expect(pregunta.texto).toBe("¿Aprobamos el presupuesto?");
    expect(pregunta.opciones.map((o) => o.texto)).toEqual(["Sí", "No"]);
  });

  it.each([
    ["vacío", ""],
    ["solo espacios", "    "],
    ["menos de 5 caracteres", "   1234   "],
    ["más de 300 caracteres", "x".repeat(301)],
  ])("rechaza el texto de pregunta (%s) con TEXTO_PREGUNTA_INVALIDO", (_motivo, texto) => {
    expect(
      codigoDeError(() => Pregunta.nueva("s-1", texto, ["Sí", "No"], generadorSecuencial())),
    ).toBe("TEXTO_PREGUNTA_INVALIDO");
  });

  it("acepta texto de pregunta de 5 y de 300 caracteres", () => {
    expect(() => Pregunta.nueva("s-1", "abcde", ["Sí", "No"], generadorSecuencial())).not.toThrow();
    expect(() =>
      Pregunta.nueva("s-1", "x".repeat(300), ["Sí", "No"], generadorSecuencial()),
    ).not.toThrow();
  });

  it.each([
    ["vacía", ""],
    ["solo espacios", "   "],
    ["más de 80 caracteres", "x".repeat(81)],
  ])("rechaza la opción (%s) con TEXTO_OPCION_INVALIDO", (_motivo, texto) => {
    expect(
      codigoDeError(() => Pregunta.nueva("s-1", TEXTO, ["Sí", texto], generadorSecuencial())),
    ).toBe("TEXTO_OPCION_INVALIDO");
  });

  it("acepta una opción de 80 caracteres", () => {
    expect(() =>
      Pregunta.nueva("s-1", TEXTO, ["Sí", "x".repeat(80)], generadorSecuencial()),
    ).not.toThrow();
  });

  it.each([
    ["ninguna", []],
    ["una", ["Sí"]],
    ["once", Array.from({ length: 11 }, (_, i) => `Opción ${i}`)],
  ])("exige entre 2 y 10 opciones (con %s) con OPCIONES_INVALIDAS", (_cuantas, textos) => {
    expect(codigoDeError(() => Pregunta.nueva("s-1", TEXTO, textos, generadorSecuencial()))).toBe(
      "OPCIONES_INVALIDAS",
    );
  });

  it("acepta 2 y 10 opciones", () => {
    expect(() => Pregunta.nueva("s-1", TEXTO, ["Sí", "No"], generadorSecuencial())).not.toThrow();
    expect(() =>
      Pregunta.nueva(
        "s-1",
        TEXTO,
        Array.from({ length: 10 }, (_, i) => `Opción ${i}`),
        generadorSecuencial(),
      ),
    ).not.toThrow();
  });

  it.each([
    ["Sí", "sí"],
    ["No", " NO "],
    ["Opción", "opción"],
  ])(
    "rechaza opciones repetidas sin distinguir mayúsculas (%j, %j) con OPCIONES_DUPLICADAS",
    (a, b) => {
      expect(codigoDeError(() => Pregunta.nueva("s-1", TEXTO, [a, b], generadorSecuencial()))).toBe(
        "OPCIONES_DUPLICADAS",
      );
    },
  );

  it("expone la plantilla Sí, No y me abstengo", () => {
    expect(OPCIONES_SI_NO_ABSTENCION).toEqual(["Sí", "No", "Me abstengo"]);
  });
});

describe("Pregunta.reconstruir", () => {
  it("recrea la pregunta con su estado y tiempos guardados", () => {
    const original = nuevaSiNo();
    original.abrir(reloj);
    original.cerrar(reloj);
    const copia = Pregunta.reconstruir({
      id: original.id,
      sesionId: original.sesionId,
      texto: original.texto,
      opciones: original.opciones,
      estado: original.estado,
      abiertaEn: original.abiertaEn,
      cerradaEn: original.cerradaEn,
      resultadoVisible: false,
    });
    expect(copia.estado).toBe("CERRADA");
    expect(copia.cerradaEn).toEqual(ahora);
  });
});

describe("transiciones de Pregunta", () => {
  it("abrir pasa de BORRADOR a ABIERTA y guarda la hora", () => {
    const pregunta = nuevaSiNo();
    pregunta.abrir(reloj);
    expect(pregunta.estado).toBe("ABIERTA");
    expect(pregunta.abiertaEn).toEqual(ahora);
  });

  it("abrir no se repite con TRANSICION_INVALIDA", () => {
    const pregunta = nuevaSiNo();
    pregunta.abrir(reloj);
    expect(codigoDeError(() => pregunta.abrir(reloj))).toBe("TRANSICION_INVALIDA");
  });

  it("cerrar pasa de ABIERTA a CERRADA y guarda la hora", () => {
    const pregunta = nuevaSiNo();
    pregunta.abrir(reloj);
    pregunta.cerrar(reloj);
    expect(pregunta.estado).toBe("CERRADA");
    expect(pregunta.cerradaEn).toEqual(ahora);
  });

  it("cerrar desde BORRADOR falla con TRANSICION_INVALIDA", () => {
    expect(codigoDeError(() => nuevaSiNo().cerrar(reloj))).toBe("TRANSICION_INVALIDA");
  });

  it("anular funciona desde BORRADOR y ABIERTA", () => {
    const borrador = nuevaSiNo();
    borrador.anular();
    expect(borrador.estado).toBe("ANULADA");

    const abierta = nuevaSiNo();
    abierta.abrir(reloj);
    abierta.anular();
    expect(abierta.estado).toBe("ANULADA");
  });

  it("anular funciona desde CERRADA", () => {
    const pregunta = nuevaSiNo();
    pregunta.abrir(reloj);
    pregunta.cerrar(reloj);
    pregunta.anular();
    expect(pregunta.estado).toBe("ANULADA");
  });

  it("anular desde CERRADA con resultado proyectado oculta el resultado", () => {
    const pregunta = nuevaSiNo();
    pregunta.abrir(reloj);
    pregunta.cerrar(reloj);
    pregunta.proyectarResultado();
    expect(pregunta.resultadoVisible).toBe(true);
    pregunta.anular();
    expect(pregunta.resultadoVisible).toBe(false);
  });

  it("anular desde ANULADA falla con TRANSICION_INVALIDA", () => {
    const pregunta = nuevaSiNo();
    pregunta.anular();
    expect(codigoDeError(() => pregunta.anular())).toBe("TRANSICION_INVALIDA");
  });

  it("proyectarResultado sobre una pregunta ANULADA falla con PREGUNTA_NO_CERRADA", () => {
    const pregunta = nuevaSiNo();
    pregunta.abrir(reloj);
    pregunta.cerrar(reloj);
    pregunta.anular();
    expect(codigoDeError(() => pregunta.proyectarResultado())).toBe("PREGUNTA_NO_CERRADA");
  });
});

describe("guardas de Pregunta", () => {
  it("exigirOpcion acepta un id de opción de la pregunta", () => {
    const pregunta = nuevaSiNo();
    expect(() => pregunta.exigirOpcion("id-2")).not.toThrow();
  });

  it("exigirOpcion rechaza un id ajeno con OPCION_INVALIDA", () => {
    expect(codigoDeError(() => nuevaSiNo().exigirOpcion("otra"))).toBe("OPCION_INVALIDA");
  });

  it("exigirAbierta solo pasa con la pregunta ABIERTA", () => {
    const pregunta = nuevaSiNo();
    expect(codigoDeError(() => pregunta.exigirAbierta())).toBe("PREGUNTA_CERRADA");
    pregunta.abrir(reloj);
    expect(() => pregunta.exigirAbierta()).not.toThrow();
    pregunta.cerrar(reloj);
    expect(codigoDeError(() => pregunta.exigirAbierta())).toBe("PREGUNTA_CERRADA");
  });
});

describe("Pregunta.proyectarResultado", () => {
  it("falla con PREGUNTA_NO_CERRADA mientras no esté CERRADA", () => {
    const pregunta = nuevaSiNo();
    expect(codigoDeError(() => pregunta.proyectarResultado())).toBe("PREGUNTA_NO_CERRADA");
    pregunta.abrir(reloj);
    expect(codigoDeError(() => pregunta.proyectarResultado())).toBe("PREGUNTA_NO_CERRADA");
  });

  it("hace visible el resultado cuando está CERRADA", () => {
    const pregunta = nuevaSiNo();
    pregunta.abrir(reloj);
    pregunta.cerrar(reloj);
    pregunta.proyectarResultado();
    expect(pregunta.resultadoVisible).toBe(true);
  });
});
