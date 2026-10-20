import { describe, expect, it } from "vitest";
import {
  esquemaCrearPregunta,
  esquemaDarLaPalabra,
  esquemaGenerarCodigos,
  esquemaIngresar,
  esquemaMocion,
  esquemaVoto,
} from "../src/index.js";

describe("esquemas de acciones", () => {
  it("ingresar pide código o token del navegador", () => {
    expect(esquemaIngresar.safeParse({ codigo: "ABCD-2345" }).success).toBe(true);
    expect(esquemaIngresar.safeParse({ tokenNavegador: "t" }).success).toBe(true);
    expect(esquemaIngresar.safeParse({}).success).toBe(false);
    expect(esquemaIngresar.safeParse({ codigo: 5 }).success).toBe(false);
  });

  it("voto exige los dos ids como texto", () => {
    expect(esquemaVoto.safeParse({ preguntaId: "p", opcionId: "o" }).success).toBe(true);
    expect(esquemaVoto.safeParse({ preguntaId: "p" }).success).toBe(false);
    expect(esquemaVoto.safeParse({ preguntaId: "", opcionId: "o" }).success).toBe(false);
  });

  it("moción solo acepta los tipos del dominio", () => {
    expect(esquemaMocion.safeParse({ nombreVisible: "Ana", tipo: "ORDEN" }).success).toBe(true);
    expect(esquemaMocion.safeParse({ nombreVisible: "Ana", tipo: "OTRA" }).success).toBe(false);
  });

  it("códigos pide una cantidad entera", () => {
    expect(esquemaGenerarCodigos.safeParse({ cantidad: 10 }).success).toBe(true);
    expect(esquemaGenerarCodigos.safeParse({ cantidad: 1.5 }).success).toBe(false);
    expect(esquemaGenerarCodigos.safeParse({ cantidad: "10" }).success).toBe(false);
  });

  it("pregunta: opciones es opcional; dar la palabra sin solicitud vale", () => {
    expect(esquemaCrearPregunta.safeParse({ texto: "¿Aprobamos?" }).success).toBe(true);
    expect(esquemaCrearPregunta.safeParse({ texto: "x", opciones: [1] }).success).toBe(false);
    expect(esquemaDarLaPalabra.safeParse({}).success).toBe(true);
  });
});
