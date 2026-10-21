import { describe, expect, it } from "vitest";
import { PoliticaAdaptativa } from "../../src/tiempo-real/intervalo-adaptativo";
import { contextoDeIntervalo } from "../../src/vistas/participante/contexto-de-intervalo";

describe("contextoDeIntervalo", () => {
  const abierta = { id: "p1" } as const;

  it("votación abierta sin voto cuenta como activa", () => {
    expect(contextoDeIntervalo({ abierta, yaVoto: false }, { enFila: false })).toEqual({
      votacionAbierta: true,
      enFilaDePalabra: false,
    });
  });

  it("votación abierta ya votada no cuenta", () => {
    expect(contextoDeIntervalo({ abierta, yaVoto: true }, { enFila: false }).votacionAbierta).toBe(
      false,
    );
  });

  it("sin votación abierta no cuenta", () => {
    expect(
      contextoDeIntervalo({ abierta: null, yaVoto: false }, { enFila: false }).votacionAbierta,
    ).toBe(false);
  });

  it("estar en la fila cuenta", () => {
    expect(
      contextoDeIntervalo({ abierta: null, yaVoto: false }, { enFila: true }).enFilaDePalabra,
    ).toBe(true);
  });

  it("con la política adaptativa: reposo 12 s, activo 3 s", () => {
    const politica = new PoliticaAdaptativa();
    expect(
      politica.intervaloMs(
        contextoDeIntervalo({ abierta: null, yaVoto: false }, { enFila: false }),
      ),
    ).toBe(12_000);
    expect(
      politica.intervaloMs(contextoDeIntervalo({ abierta, yaVoto: false }, { enFila: false })),
    ).toBe(3000);
    expect(
      politica.intervaloMs(contextoDeIntervalo({ abierta: null, yaVoto: false }, { enFila: true })),
    ).toBe(3000);
  });
});
