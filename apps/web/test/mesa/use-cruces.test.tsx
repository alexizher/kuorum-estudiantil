// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CruceDeSesion } from "@/vistas/mesa/cliente-de-mesa";
import { useCruces } from "@/vistas/mesa/use-cruces";
import { clienteDeMesaFalso } from "./falsos";

const cruce = (id: string): CruceDeSesion => ({
  id,
  titulo: `Sesión ${id}`,
  cuerpo: "Artes",
  inicioLocal: "2026-11-03T14:00",
  finLocal: "2026-11-03T16:00",
});

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function pasar(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("useCruces", () => {
  it("consulta una sola vez 400 ms después del último cambio", async () => {
    const cliente = clienteDeMesaFalso();
    cliente.buscarCruces.mockResolvedValue([cruce("a")]);
    const { result, rerender } = renderHook((tramo) => useCruces(cliente, tramo), {
      initialProps: { inicio: "2026-11-03T14:00", fin: "2026-11-03T16:00" },
    });
    rerender({ inicio: "2026-11-03T14:00", fin: "2026-11-03T17:00" });
    rerender({ inicio: "2026-11-03T15:00", fin: "2026-11-03T17:00" });
    await pasar(399);
    expect(cliente.buscarCruces).not.toHaveBeenCalled();
    await pasar(1);
    expect(cliente.buscarCruces).toHaveBeenCalledTimes(1);
    expect(cliente.buscarCruces).toHaveBeenCalledWith({
      inicio: "2026-11-03T15:00",
      fin: "2026-11-03T17:00",
    });
    expect(result.current.cruces).toEqual([cruce("a")]);
  });

  it("descarta la respuesta de una consulta vieja", async () => {
    const cliente = clienteDeMesaFalso();
    let soltarVieja: (valor: CruceDeSesion[]) => void = () => undefined;
    cliente.buscarCruces
      .mockImplementationOnce(() => new Promise((resolver) => (soltarVieja = resolver)))
      .mockResolvedValueOnce([cruce("nueva")]);
    const { result, rerender } = renderHook((tramo) => useCruces(cliente, tramo), {
      initialProps: { inicio: "2026-11-03T14:00", fin: "2026-11-03T16:00" },
    });
    await pasar(400);
    rerender({ inicio: "2026-11-03T18:00", fin: "2026-11-03T20:00" });
    await pasar(400);
    expect(result.current.cruces).toEqual([cruce("nueva")]);
    await act(async () => soltarVieja([cruce("vieja")]));
    expect(result.current.cruces).toEqual([cruce("nueva")]);
  });

  it("sin inicio o sin fin no consulta y no muestra cruces", async () => {
    const cliente = clienteDeMesaFalso();
    const { result } = renderHook(() =>
      useCruces(cliente, { inicio: "", fin: "2026-11-03T16:00" }),
    );
    await pasar(1000);
    expect(cliente.buscarCruces).not.toHaveBeenCalled();
    expect(result.current.cruces).toEqual([]);
  });

  it("si la consulta falla, no muestra cruces viejos", async () => {
    const cliente = clienteDeMesaFalso();
    cliente.buscarCruces
      .mockResolvedValueOnce([cruce("a")])
      .mockRejectedValueOnce(new Error("red"));
    const { result, rerender } = renderHook((tramo) => useCruces(cliente, tramo), {
      initialProps: { inicio: "2026-11-03T14:00", fin: "2026-11-03T16:00" },
    });
    await pasar(400);
    expect(result.current.cruces).toHaveLength(1);
    rerender({ inicio: "2026-11-03T18:00", fin: "2026-11-03T20:00" });
    await pasar(400);
    expect(result.current.cruces).toEqual([]);
  });
});
