// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorDeAccion } from "../../src/vistas/participante/cliente-de-sala";
import { useVotacion } from "../../src/vistas/participante/use-votacion";
import { preguntaAbierta, preguntaConResultado } from "../proyeccion/estados";
import { AlmacenEnMemoria, clienteFalso } from "./falsos";

afterEach(cleanup);

function montar(
  pregunta: ReturnType<typeof preguntaAbierta> | null = preguntaAbierta(),
  almacen = new AlmacenEnMemoria(),
  cliente = clienteFalso(),
) {
  const alPerderIngreso = vi.fn();
  const vista = renderHook(
    ({ p }) => useVotacion("K7F2", p, cliente, { almacen, alPerderIngreso }),
    { initialProps: { p: pregunta as ReturnType<typeof preguntaAbierta> | null } },
  );
  return { ...vista, cliente, almacen, alPerderIngreso };
}

describe("useVotacion", () => {
  it("sin pregunta no hay votación abierta", () => {
    const { result } = montar(null);
    expect(result.current.abierta).toBeNull();
    expect(result.current.yaVoto).toBe(false);
  });

  it("una pregunta ABIERTA es la votación abierta", () => {
    const { result } = montar();
    expect(result.current.abierta?.id).toBe("p1");
  });

  it("una pregunta cerrada no es votación abierta", () => {
    const { result } = montar(preguntaConResultado());
    expect(result.current.abierta).toBeNull();
    expect(result.current.yaVoto).toBe(false);
  });

  it("elige una opción y la cambia hasta votar", () => {
    const { result } = montar();
    expect(result.current.elegida).toBeNull();
    act(() => result.current.elegir("o1"));
    act(() => result.current.elegir("o2"));
    expect(result.current.elegida).toBe("o2");
  });

  it("vota, lo guarda y confirma", async () => {
    const { result, cliente, almacen } = montar();
    act(() => result.current.elegir("o1"));
    await act(() => result.current.votar());
    expect(cliente.votar).toHaveBeenCalledWith("K7F2", "p1", "o1");
    expect(result.current.yaVoto).toBe(true);
    expect(JSON.parse(almacen.leer("kuorum-votadas-K7F2") ?? "[]")).toEqual(["p1"]);
  });

  it("al volver a abrir la página sigue como votada", () => {
    const almacen = new AlmacenEnMemoria();
    almacen.escribir("kuorum-votadas-K7F2", JSON.stringify(["p1"]));
    const { result } = montar(preguntaAbierta(), almacen);
    expect(result.current.yaVoto).toBe(true);
  });

  it("votar sin elegir no llama a la API y avisa", async () => {
    const { result, cliente } = montar();
    await act(() => result.current.votar());
    expect(cliente.votar).not.toHaveBeenCalled();
    expect(result.current.error).toBe("Elige una opción antes de votar.");
  });

  it("un 409 YA_VOTO lleva a la confirmación sin error", async () => {
    const cliente = clienteFalso();
    cliente.votar.mockRejectedValue(
      new ErrorDeAccion(409, "YA_VOTO", "Ya votaste en esta pregunta."),
    );
    const { result, almacen } = montar(preguntaAbierta(), new AlmacenEnMemoria(), cliente);
    act(() => result.current.elegir("o0"));
    await act(() => result.current.votar());
    expect(result.current.yaVoto).toBe(true);
    expect(result.current.error).toBeUndefined();
    expect(JSON.parse(almacen.leer("kuorum-votadas-K7F2") ?? "[]")).toEqual(["p1"]);
  });

  it("otros errores muestran el mensaje y dejan volver a intentar", async () => {
    const cliente = clienteFalso();
    cliente.votar.mockRejectedValueOnce(
      new ErrorDeAccion(409, "PREGUNTA_CERRADA", "La votación ya se cerró."),
    );
    const { result } = montar(preguntaAbierta(), new AlmacenEnMemoria(), cliente);
    act(() => result.current.elegir("o0"));
    await act(() => result.current.votar());
    expect(result.current.yaVoto).toBe(false);
    expect(result.current.error).toBe("La votación ya se cerró.");
    expect(result.current.enviando).toBe(false);
    act(() => result.current.elegir("o1"));
    expect(result.current.error).toBeUndefined();
  });

  it("un 401 SIN_INGRESO avisa para volver al formulario del código", async () => {
    const cliente = clienteFalso();
    cliente.votar.mockRejectedValue(new ErrorDeAccion(401, "SIN_INGRESO"));
    const { result, alPerderIngreso } = montar(preguntaAbierta(), new AlmacenEnMemoria(), cliente);
    act(() => result.current.elegir("o0"));
    await act(() => result.current.votar());
    expect(alPerderIngreso).toHaveBeenCalledOnce();
    expect(result.current.yaVoto).toBe(false);
  });

  it("no manda dos votos mientras uno está en curso", async () => {
    const cliente = clienteFalso();
    let terminar: () => void = () => undefined;
    cliente.votar.mockReturnValue(new Promise<void>((r) => (terminar = r)));
    const { result } = montar(preguntaAbierta(), new AlmacenEnMemoria(), cliente);
    act(() => result.current.elegir("o0"));
    let primero: Promise<void> = Promise.resolve();
    act(() => {
      primero = result.current.votar();
      void result.current.votar();
    });
    expect(cliente.votar).toHaveBeenCalledOnce();
    expect(result.current.enviando).toBe(true);
    await act(async () => {
      terminar();
      await primero;
    });
    expect(result.current.enviando).toBe(false);
  });

  it("otra pregunta empieza sin opción elegida", () => {
    const { result, rerender } = montar();
    act(() => result.current.elegir("o1"));
    rerender({ p: { ...preguntaAbierta(), id: "p2" } });
    expect(result.current.elegida).toBeNull();
    expect(result.current.yaVoto).toBe(false);
  });
});
