import { describe, expect, it } from "vitest";
import {
  INTERVALO_ACTIVO_MS,
  INTERVALO_EN_REPOSO_MS,
  PoliticaAdaptativa,
  PoliticaFija,
  type PoliticaDeIntervalo,
} from "../../src/tiempo-real/intervalo-adaptativo";

describe("PoliticaAdaptativa", () => {
  const politica = new PoliticaAdaptativa();

  it("usa 3 s con una votación abierta", () => {
    expect(politica.intervaloMs({ votacionAbierta: true, enFilaDePalabra: false })).toBe(3000);
  });

  it("usa 3 s si la persona está en la fila de palabra", () => {
    expect(politica.intervaloMs({ votacionAbierta: false, enFilaDePalabra: true })).toBe(3000);
  });

  it("usa 12 s en el resto de los casos", () => {
    expect(politica.intervaloMs({ votacionAbierta: false, enFilaDePalabra: false })).toBe(12_000);
  });

  it("expone las constantes con nombre", () => {
    expect(INTERVALO_ACTIVO_MS).toBe(3000);
    expect(INTERVALO_EN_REPOSO_MS).toBe(12_000);
  });
});

describe("PoliticaFija", () => {
  it("devuelve siempre el mismo intervalo", () => {
    const politica: PoliticaDeIntervalo = new PoliticaFija(500);
    expect(politica.intervaloMs({ votacionAbierta: true, enFilaDePalabra: true })).toBe(500);
    expect(politica.intervaloMs({ votacionAbierta: false, enFilaDePalabra: false })).toBe(500);
  });
});
