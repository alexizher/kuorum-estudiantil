import { describe, expect, it } from "vitest";
import {
  ARRANQUE_MS,
  INTERVALO_ACTIVO_MS,
  INTERVALO_EN_REPOSO_MS,
  PoliticaAdaptativa,
  PoliticaConArranque,
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

describe("PoliticaConArranque", () => {
  const enReposo = { votacionAbierta: false, enFilaDePalabra: false };

  function conReloj(base: PoliticaDeIntervalo = new PoliticaAdaptativa()) {
    let ahora = 1_000_000;
    const politica = new PoliticaConArranque(base, () => ahora);
    return { politica, avanzar: (ms: number) => (ahora += ms) };
  }

  it("consulta con el intervalo activo durante los primeros 30 s aunque no haya nada abierto", () => {
    const { politica, avanzar } = conReloj();
    expect(politica.intervaloMs(enReposo)).toBe(INTERVALO_ACTIVO_MS);
    avanzar(ARRANQUE_MS - 1);
    expect(politica.intervaloMs(enReposo)).toBe(INTERVALO_ACTIVO_MS);
  });

  it("pasado el arranque vuelve a la política de base", () => {
    const { politica, avanzar } = conReloj();
    avanzar(ARRANQUE_MS);
    expect(politica.intervaloMs(enReposo)).toBe(INTERVALO_EN_REPOSO_MS);
    expect(politica.intervaloMs({ votacionAbierta: true, enFilaDePalabra: false })).toBe(
      INTERVALO_ACTIVO_MS,
    );
  });

  it("nunca alarga un intervalo de base más corto", () => {
    const { politica } = conReloj(new PoliticaFija(500));
    expect(politica.intervaloMs(enReposo)).toBe(500);
  });
});
