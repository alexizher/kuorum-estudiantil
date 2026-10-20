import { describe, expect, it } from "vitest";
import { CodigoDeAcceso, CodigoDeSala } from "@kuorum/domain";
import { GeneradorDeCodigosAleatorio } from "../../src/codigos/generador-aleatorio.js";
import { GeneradorDeIdsUuid } from "../../src/crypto/generador-de-ids-uuid.js";

describe("GeneradorDeCodigosAleatorio", () => {
  const generador = new GeneradorDeCodigosAleatorio();

  it("genera códigos de sala y de acceso válidos para el dominio", () => {
    for (let i = 0; i < 200; i += 1) {
      const sala = generador.codigoDeSala();
      const acceso = generador.codigoDeAcceso();
      expect(sala).toBeInstanceOf(CodigoDeSala);
      expect(sala.valor).toMatch(/^[2-9A-HJKMN-Z]{4}$/);
      expect(CodigoDeAcceso.crear(acceso.valor).valor).toBe(acceso.valor);
      expect(acceso.valor).toMatch(/^[2-9A-HJKMN-Z]{4}-[2-9A-HJKMN-Z]{4}$/);
    }
  });

  it("no repite en una muestra razonable", () => {
    const codigos = new Set(Array.from({ length: 500 }, () => generador.codigoDeAcceso().valor));
    expect(codigos.size).toBe(500);
  });

  it("usa todo el alfabeto, sin sesgo grosero", () => {
    const vistos = new Set<string>();
    for (let i = 0; i < 400; i += 1)
      for (const c of generador.codigoDeAcceso().valor) vistos.add(c);
    vistos.delete("-");
    expect(vistos.size).toBe(31);
  });
});

describe("GeneradorDeIdsUuid", () => {
  it("genera UUID v4 distintos", () => {
    const ids = new GeneradorDeIdsUuid();
    const a = ids.nuevo();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(ids.nuevo()).not.toBe(a);
  });
});
