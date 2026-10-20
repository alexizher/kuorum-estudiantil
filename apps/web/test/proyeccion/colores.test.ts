import { describe, expect, it } from "vitest";
import { coloresDeOpciones } from "../../src/vistas/proyeccion/colores-de-opciones";

describe("coloresDeOpciones", () => {
  it("Sí, No y Me abstengo llevan verde, rojo y ámbar", () => {
    expect(coloresDeOpciones(["Sí", "No", "Me abstengo"])).toEqual(["si", "no", "ambar"]);
  });

  it("no depende del orden ni de mayúsculas y espacios", () => {
    expect(coloresDeOpciones([" me abstengo", "SÍ ", "no"])).toEqual(["ambar", "si", "no"]);
  });

  it("cualquier otro conjunto va todo en tinta", () => {
    expect(coloresDeOpciones(["Plancha A", "Plancha B"])).toEqual(["tinta", "tinta"]);
  });

  it("Sí y No sin abstención no es el conjunto exacto y va en tinta", () => {
    expect(coloresDeOpciones(["Sí", "No"])).toEqual(["tinta", "tinta"]);
  });

  it("un conjunto con una opción extra va en tinta", () => {
    expect(coloresDeOpciones(["Sí", "No", "Me abstengo", "Aplazar"])).toEqual([
      "tinta",
      "tinta",
      "tinta",
      "tinta",
    ]);
  });
});
