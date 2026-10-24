// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ErrorDeMesa } from "@/vistas/mesa/cliente-de-mesa";
import { useCodigos } from "@/vistas/mesa/use-codigos";
import { useEntrega } from "@/vistas/mesa/use-entrega";
import { clienteDeMesaFalso } from "./falsos";

afterEach(cleanup);

describe("useCodigos", () => {
  it("valida la cantidad de 1 a 2000 antes de llamar", async () => {
    const cliente = clienteDeMesaFalso();
    const { result } = renderHook(() => useCodigos("s1", cliente));
    for (const cantidad of [0, 2001, 1.5, Number.NaN]) {
      await act(() => result.current.generar(cantidad));
      expect(result.current.error).toBe("Escribe una cantidad entre 1 y 2000.");
    }
    expect(cliente.generarCodigos).not.toHaveBeenCalled();
  });

  it("genera y deja los códigos solo en memoria", async () => {
    const cliente = clienteDeMesaFalso();
    const { result } = renderHook(() => useCodigos("s1", cliente));
    expect(result.current.codigos).toBeNull();
    await act(() => result.current.generar(3));
    expect(cliente.generarCodigos).toHaveBeenCalledWith("s1", 3);
    expect(result.current.codigos).toHaveLength(3);
    expect(result.current.error).toBeUndefined();
  });

  it("descartar borra los códigos de la pantalla", async () => {
    const { result } = renderHook(() => useCodigos("s1", clienteDeMesaFalso()));
    await act(() => result.current.generar(2));
    act(() => result.current.descartar());
    expect(result.current.codigos).toBeNull();
  });

  it("si falla muestra el mensaje y no deja códigos", async () => {
    const cliente = clienteDeMesaFalso();
    cliente.generarCodigos.mockRejectedValueOnce(new ErrorDeMesa(404, "SESION_NO_ENCONTRADA"));
    const { result } = renderHook(() => useCodigos("s1", cliente));
    await act(() => result.current.generar(2));
    expect(result.current.error).toBe("No encontramos esa sesión.");
    expect(result.current.codigos).toBeNull();
  });

  it("no guarda nada en localStorage ni en la URL", async () => {
    const { result } = renderHook(() => useCodigos("s1", clienteDeMesaFalso()));
    await act(() => result.current.generar(2));
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    expect(window.location.search).toBe("");
  });
});

describe("useEntrega", () => {
  it("al principio no hay código ni entregados", () => {
    const { result } = renderHook(() => useEntrega("s1", clienteDeMesaFalso()));
    expect(result.current.actual).toBeNull();
    expect(result.current.entregados).toBe(0);
  });

  it("pide un lote de 50 al mostrar el primero y los reparte de uno en uno", async () => {
    const cliente = clienteDeMesaFalso();
    const { result } = renderHook(() => useEntrega("s1", cliente));
    await act(() => result.current.siguiente());
    expect(cliente.generarCodigos).toHaveBeenCalledWith("s1", 50);
    expect(result.current.actual).toBe("AAAA-1000");
    expect(result.current.entregados).toBe(1);
    await act(() => result.current.siguiente());
    expect(result.current.actual).toBe("AAAA-1001");
    expect(result.current.entregados).toBe(2);
    expect(cliente.generarCodigos).toHaveBeenCalledTimes(1);
  });

  it("al gastar el lote pide otro, y no repite códigos", async () => {
    const cliente = clienteDeMesaFalso();
    cliente.generarCodigos
      .mockResolvedValueOnce(["AAAA-0001", "AAAA-0002"])
      .mockResolvedValueOnce(["BBBB-0001"]);
    const { result } = renderHook(() => useEntrega("s1", cliente));
    const vistos: Array<string | null> = [];
    for (let i = 0; i < 3; i++) {
      await act(() => result.current.siguiente());
      vistos.push(result.current.actual);
    }
    expect(vistos).toEqual(["AAAA-0001", "AAAA-0002", "BBBB-0001"]);
    expect(cliente.generarCodigos).toHaveBeenCalledTimes(2);
    expect(result.current.entregados).toBe(3);
  });

  it("si falla el lote conserva el código actual y muestra el error", async () => {
    const cliente = clienteDeMesaFalso();
    cliente.generarCodigos
      .mockResolvedValueOnce(["AAAA-0001"])
      .mockRejectedValueOnce(new ErrorDeMesa(0, "SIN_CONEXION"));
    const { result } = renderHook(() => useEntrega("s1", cliente));
    await act(() => result.current.siguiente());
    await act(() => result.current.siguiente());
    expect(result.current.actual).toBe("AAAA-0001");
    expect(result.current.entregados).toBe(1);
    expect(result.current.error).toMatch(/No hay conexión/);
  });

  it("no pide dos lotes si se pulsa dos veces seguidas", async () => {
    const cliente = clienteDeMesaFalso();
    const { result } = renderHook(() => useEntrega("s1", cliente));
    await act(async () => {
      void result.current.siguiente();
      void result.current.siguiente();
    });
    expect(cliente.generarCodigos).toHaveBeenCalledTimes(1);
    expect(result.current.entregados).toBe(1);
  });
});
