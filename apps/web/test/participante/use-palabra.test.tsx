// @vitest-environment jsdom
import type { EstadoDeSala } from "@kuorum/contracts";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorDeAccion } from "../../src/vistas/participante/cliente-de-sala";
import { usePalabra } from "../../src/vistas/participante/use-palabra";
import { conLaPalabra, salaVacia } from "../proyeccion/estados";
import { AlmacenEnMemoria, clienteFalso, enFila, mocionEnFila } from "./falsos";

afterEach(cleanup);

function conFila(version: number, fila: EstadoDeSala["palabra"]["fila"]): EstadoDeSala {
  return salaVacia({ version, palabra: { conLaPalabra: null, fila } });
}

function montar(almacen = new AlmacenEnMemoria(), cliente = clienteFalso()) {
  const alPerderIngreso = vi.fn();
  const vista = renderHook(
    ({ estado }) => usePalabra("K7F2", estado, cliente, { almacen, alPerderIngreso }),
    { initialProps: { estado: salaVacia() as EstadoDeSala | null } },
  );
  return { ...vista, cliente, almacen, alPerderIngreso };
}

describe("usePalabra", () => {
  it("sin solicitudes no hay turnos ni fila", () => {
    const { result } = montar();
    expect(result.current.turnos).toEqual([]);
    expect(result.current.enFila).toBe(false);
  });

  it("pedir la palabra exige un nombre", async () => {
    const { result, cliente } = montar();
    await act(() => result.current.pedirPalabra());
    expect(cliente.pedirPalabra).not.toHaveBeenCalled();
    expect(result.current.error).toBe("Escribe cómo quieres que te anuncien.");
  });

  it("pide la palabra, recuerda el nombre y la solicitud", async () => {
    const { result, cliente, almacen } = montar();
    act(() => result.current.escribirNombre("  Ana Gómez, Derecho "));
    await act(() => result.current.pedirPalabra());
    expect(cliente.pedirPalabra).toHaveBeenCalledWith("K7F2", "Ana Gómez, Derecho");
    expect(almacen.leer("kuorum-nombre")).toBe("Ana Gómez, Derecho");
    expect(JSON.parse(almacen.leer("kuorum-solicitudes-K7F2") ?? "[]")).toEqual(["s-1"]);
    expect(result.current.turnos).toEqual([
      {
        id: "s-1",
        tipo: "INTERVENCION",
        mocion: null,
        situacion: "pendiente",
        lugar: null,
        total: 0,
      },
    ]);
    expect(result.current.enFila).toBe(true);
  });

  it("la siguiente vez ya conoce el nombre", async () => {
    const almacen = new AlmacenEnMemoria();
    almacen.escribir("kuorum-nombre", "Ana");
    const { result, cliente } = montar(almacen);
    expect(result.current.nombreRecordado).toBe(true);
    await act(() => result.current.pedirPalabra());
    expect(cliente.pedirPalabra).toHaveBeenCalledWith("K7F2", "Ana");
  });

  it("el lugar sale de la posición en la fila del estado público", async () => {
    const { result, rerender } = montar();
    act(() => result.current.escribirNombre("Ana"));
    await act(() => result.current.pedirPalabra());
    rerender({
      estado: conFila(2, [enFila("a"), enFila("b"), enFila("s-1"), enFila("c")]),
    });
    expect(result.current.turnos).toEqual([
      { id: "s-1", tipo: "INTERVENCION", mocion: null, situacion: "en-fila", lugar: 3, total: 4 },
    ]);
  });

  it("recuerda las solicitudes al recargar", () => {
    const almacen = new AlmacenEnMemoria();
    almacen.escribir("kuorum-solicitudes-K7F2", JSON.stringify(["s-9"]));
    const { result } = montar(almacen);
    // todavía no sale en el estado y no se pidió en esta carga: no hay nada que mostrar
    expect(result.current.turnos).toEqual([]);
    const { result: otro } = renderHook(() =>
      usePalabra("K7F2", conFila(5, [enFila("x"), enFila("s-9")]), clienteFalso(), {
        almacen,
        alPerderIngreso: vi.fn(),
      }),
    );
    expect(otro.current.turnos[0]).toMatchObject({ id: "s-9", lugar: 2, situacion: "en-fila" });
  });

  it("tiene la palabra cuando su solicitud es la que habla", () => {
    const almacen = new AlmacenEnMemoria();
    almacen.escribir("kuorum-solicitudes-K7F2", JSON.stringify(["s1"]));
    const estado = salaVacia({ palabra: { conLaPalabra: conLaPalabra(), fila: [] } });
    const { result } = renderHook(() =>
      usePalabra("K7F2", estado, clienteFalso(), { almacen, alPerderIngreso: vi.fn() }),
    );
    expect(result.current.turnos[0]).toMatchObject({
      id: "s1",
      situacion: "con-la-palabra",
      lugar: null,
    });
    expect(result.current.enFila).toBe(true);
  });

  it("una solicitud que no aparece en dos estados nuevos deja de esperarse", async () => {
    const { result, rerender } = montar();
    act(() => result.current.escribirNombre("Ana"));
    await act(() => result.current.pedirPalabra());
    rerender({ estado: conFila(2, [enFila("a")]) });
    expect(result.current.turnos[0]?.situacion).toBe("pendiente");
    rerender({ estado: conFila(3, [enFila("a")]) });
    expect(result.current.turnos).toEqual([]);
    expect(result.current.enFila).toBe(false);
  });

  it("presenta una moción con el nombre recordado", async () => {
    const almacen = new AlmacenEnMemoria();
    almacen.escribir("kuorum-nombre", "Ana");
    const { result, cliente } = montar(almacen);
    await act(() => result.current.presentarMocion("ORDEN"));
    expect(cliente.presentarMocion).toHaveBeenCalledWith("K7F2", "Ana", "ORDEN");
    expect(result.current.turnos[0]).toMatchObject({ id: "s-2", tipo: "MOCION", mocion: "ORDEN" });
    expect(result.current.tieneMocion).toBe(true);
    expect(result.current.tieneIntervencion).toBe(false);
  });

  it("la moción también exige nombre", async () => {
    const { result, cliente } = montar();
    await act(() => result.current.presentarMocion("ORDEN"));
    expect(cliente.presentarMocion).not.toHaveBeenCalled();
    expect(result.current.error).toBe("Escribe cómo quieres que te anuncien.");
  });

  it("el tipo de la moción se toma del estado cuando ya aparece", async () => {
    const almacen = new AlmacenEnMemoria();
    almacen.escribir("kuorum-nombre", "Ana");
    const { result, rerender } = montar(almacen);
    await act(() => result.current.presentarMocion("ACLARACION"));
    rerender({
      estado: conFila(2, [mocionEnFila("m0", "ORDEN"), mocionEnFila("s-2", "ACLARACION")]),
    });
    expect(result.current.turnos[0]).toMatchObject({ lugar: 2, total: 2, mocion: "ACLARACION" });
  });

  it("retirarse llama a la API y quita el turno al instante", async () => {
    const { result, cliente, almacen } = montar();
    act(() => result.current.escribirNombre("Ana"));
    await act(() => result.current.pedirPalabra());
    await act(() => result.current.retirar("s-1"));
    expect(cliente.retirar).toHaveBeenCalledWith("K7F2", "s-1");
    expect(result.current.turnos).toEqual([]);
    expect(JSON.parse(almacen.leer("kuorum-solicitudes-K7F2") ?? "[]")).toEqual([]);
  });

  it("si retirar falla muestra el error y conserva el turno", async () => {
    const cliente = clienteFalso();
    cliente.retirar.mockRejectedValue(new ErrorDeAccion(0, "SIN_CONEXION", "No hay conexión."));
    const { result } = montar(new AlmacenEnMemoria(), cliente);
    act(() => result.current.escribirNombre("Ana"));
    await act(() => result.current.pedirPalabra());
    await act(() => result.current.retirar("s-1"));
    expect(result.current.error).toBe("No hay conexión.");
    expect(result.current.turnos).toHaveLength(1);
  });

  it("YA_EN_LA_FILA muestra el mensaje sin crear otro turno", async () => {
    const cliente = clienteFalso();
    cliente.pedirPalabra.mockRejectedValue(
      new ErrorDeAccion(409, "YA_EN_LA_FILA", "Ya estás en la fila."),
    );
    const { result } = montar(new AlmacenEnMemoria(), cliente);
    act(() => result.current.escribirNombre("Ana"));
    await act(() => result.current.pedirPalabra());
    expect(result.current.error).toBe("Ya estás en la fila.");
    expect(result.current.turnos).toEqual([]);
  });

  it("un 401 avisa para volver al formulario del código", async () => {
    const cliente = clienteFalso();
    cliente.pedirPalabra.mockRejectedValue(new ErrorDeAccion(401, "SIN_INGRESO"));
    const { result, alPerderIngreso } = montar(new AlmacenEnMemoria(), cliente);
    act(() => result.current.escribirNombre("Ana"));
    await act(() => result.current.pedirPalabra());
    expect(alPerderIngreso).toHaveBeenCalledOnce();
  });
});
