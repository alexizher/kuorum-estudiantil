// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSegundosRestantes } from "@/vistas/mesa/use-segundos-restantes";
import { HORA, conLaPalabra, salaVacia } from "../proyeccion/estados";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useSegundosRestantes", () => {
  it("sin orador no hay cuenta", () => {
    const { result } = renderHook(() => useSegundosRestantes(salaVacia()));
    expect(result.current).toBeNull();
  });

  it("cuenta con la hora del servidor aunque el reloj local esté corrido", () => {
    let local = 1_000_000;
    const estado = salaVacia({ palabra: { conLaPalabra: conLaPalabra(HORA, 180), fila: [] } });
    const adelantado = {
      ...estado,
      horaDelServidor: new Date(Date.parse(HORA) + 40_000).toISOString(),
    };
    const { result } = renderHook(() =>
      useSegundosRestantes(adelantado, { reloj: () => local, intervaloMs: 250 }),
    );
    expect(result.current).toBe(140);
    act(() => {
      local += 10_000;
      vi.advanceTimersByTime(250);
    });
    expect(result.current).toBe(130);
  });

  it("no baja de cero", () => {
    let local = 0;
    const estado = salaVacia({ palabra: { conLaPalabra: conLaPalabra(HORA, 5), fila: [] } });
    const { result } = renderHook(() =>
      useSegundosRestantes(estado, { reloj: () => local, intervaloMs: 250 }),
    );
    act(() => {
      local += 60_000;
      vi.advanceTimersByTime(250);
    });
    expect(result.current).toBe(0);
  });
});
