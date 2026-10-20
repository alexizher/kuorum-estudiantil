import { describe, expect, it } from "vitest";
import { elegirVista } from "../../src/vistas/proyeccion/elegir-vista";
import { conLaPalabra, preguntaAbierta, preguntaConResultado, salaVacia } from "./estados";

describe("elegirVista", () => {
  it("sin pregunta y sin palabra espera", () => {
    expect(elegirVista(salaVacia())).toBe("esperando");
  });

  it("pregunta abierta muestra la votación", () => {
    expect(elegirVista(salaVacia({ pregunta: preguntaAbierta() }))).toBe("votacion");
  });

  it("pregunta cerrada con resultado muestra los resultados", () => {
    expect(elegirVista(salaVacia({ pregunta: preguntaConResultado() }))).toBe("resultados");
  });

  it("pregunta cerrada sin resultado visible espera", () => {
    const cerrada = { ...preguntaAbierta(), estado: "CERRADA" as const };
    expect(elegirVista(salaVacia({ pregunta: cerrada }))).toBe("esperando");
  });

  it("alguien con la palabra y sin pregunta abierta muestra la palabra", () => {
    const palabra = { conLaPalabra: conLaPalabra(), fila: [] };
    expect(elegirVista(salaVacia({ palabra }))).toBe("palabra");
  });

  it("la votación abierta manda sobre la palabra", () => {
    const palabra = { conLaPalabra: conLaPalabra(), fila: [] };
    expect(elegirVista(salaVacia({ palabra, pregunta: preguntaAbierta() }))).toBe("votacion");
  });

  it("quien habla manda sobre un resultado que ya quedó atrás", () => {
    const palabra = { conLaPalabra: conLaPalabra(), fila: [] };
    expect(elegirVista(salaVacia({ palabra, pregunta: preguntaConResultado() }))).toBe("palabra");
  });
});
