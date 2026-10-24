// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useEstadoDeSala } from "@/vistas/participante/use-estado-de-sala";
import { salaVacia } from "../proyeccion/estados";
import { FuenteFalsa } from "./falsos";

afterEach(cleanup);

describe("useEstadoDeSala", () => {
  it("empieza sin estado y se suscribe al código", () => {
    const fuente = new FuenteFalsa();
    const { result } = renderHook(() => useEstadoDeSala(fuente, "K7F2"));
    expect(result.current).toEqual({ estado: null, disponible: true, sinConexion: false });
    expect(fuente.codigo).toBe("K7F2");
  });

  it("guarda el último estado", () => {
    const fuente = new FuenteFalsa();
    const { result } = renderHook(() => useEstadoDeSala(fuente, "K7F2"));
    act(() => fuente.alCambiar?.(salaVacia({ version: 4 })));
    expect(result.current.estado?.version).toBe(4);
  });

  it("un 404 deja la sala no disponible", () => {
    const fuente = new FuenteFalsa();
    const { result } = renderHook(() => useEstadoDeSala(fuente, "K7F2"));
    act(() => fuente.alNoExistir?.());
    expect(result.current.disponible).toBe(false);
  });

  for (const terminal of ["CERRADA", "ACTA_FINAL", "CANCELADA"] as const) {
    it(`una sala ${terminal} no está disponible`, () => {
      const fuente = new FuenteFalsa();
      const { result } = renderHook(() => useEstadoDeSala(fuente, "K7F2"));
      const base = salaVacia();
      act(() => fuente.alCambiar?.({ ...base, sala: { ...base.sala, estado: terminal } }));
      expect(result.current.disponible).toBe(false);
    });
  }

  it("avisa sin conexión tras 3 fallos y lo quita con el primer éxito", () => {
    const fuente = new FuenteFalsa();
    const { result } = renderHook(() => useEstadoDeSala(fuente, "K7F2"));
    const intentar = (ok: boolean) => act(() => fuente.alIntentar?.(ok));
    intentar(false);
    intentar(false);
    expect(result.current.sinConexion).toBe(false);
    intentar(false);
    expect(result.current.sinConexion).toBe(true);
    intentar(true);
    expect(result.current.sinConexion).toBe(false);
  });

  it("cancela la suscripción al desmontar", () => {
    const fuente = new FuenteFalsa();
    const { unmount } = renderHook(() => useEstadoDeSala(fuente, "K7F2"));
    unmount();
    expect(fuente.canceladas).toBe(1);
  });
});
