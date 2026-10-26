// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useFormularioDePregunta } from "@/vistas/mesa/use-formulario-de-pregunta";

afterEach(cleanup);

function montar(resultado = true) {
  const crear = vi.fn<(texto: string, opciones?: string[]) => Promise<boolean>>(
    async () => resultado,
  );
  const vista = renderHook(() => useFormularioDePregunta(crear));
  return { ...vista, crear };
}

describe("useFormularioDePregunta", () => {
  it("empieza con la plantilla Sí, No, Me abstengo y sin opciones propias", () => {
    const { result } = montar();
    expect(result.current.plantilla).toBe(true);
    expect(result.current.opciones).toEqual(["", ""]);
  });

  it("con plantilla manda solo el texto", async () => {
    const { result, crear } = montar();
    act(() => result.current.escribirTexto("  ¿Aprueba el orden del día? "));
    await act(() => result.current.enviar());
    expect(crear).toHaveBeenCalledWith("¿Aprueba el orden del día?", undefined);
  });

  it("el texto debe tener de 5 a 300 caracteres", async () => {
    const { result, crear } = montar();
    act(() => result.current.escribirTexto("¿Sí?"));
    await act(() => result.current.enviar());
    expect(result.current.error).toBe("La pregunta debe tener entre 5 y 300 caracteres.");
    act(() => result.current.escribirTexto("x".repeat(301)));
    await act(() => result.current.enviar());
    expect(result.current.error).toBe("La pregunta debe tener entre 5 y 300 caracteres.");
    expect(crear).not.toHaveBeenCalled();
  });

  it("con opciones propias manda las limpias", async () => {
    const { result, crear } = montar();
    act(() => {
      result.current.escribirTexto("¿Quién preside la mesa?");
      result.current.elegirPlantilla(false);
    });
    act(() => {
      result.current.escribirOpcion(0, " Ana ");
      result.current.escribirOpcion(1, "Luis");
    });
    await act(() => result.current.enviar());
    expect(crear).toHaveBeenCalledWith("¿Quién preside la mesa?", ["Ana", "Luis"]);
  });

  it("exige dos opciones con texto y sin repetir", async () => {
    const { result, crear } = montar();
    act(() => {
      result.current.escribirTexto("¿Quién preside la mesa?");
      result.current.elegirPlantilla(false);
      result.current.escribirOpcion(0, "Ana");
    });
    await act(() => result.current.enviar());
    expect(result.current.error).toBe("Escribe al menos dos opciones.");
    act(() => result.current.escribirOpcion(1, "ana"));
    await act(() => result.current.enviar());
    expect(result.current.error).toBe("Las opciones no pueden repetirse.");
    expect(crear).not.toHaveBeenCalled();
  });

  it("agrega hasta 10 opciones y quita hasta dejar 2", () => {
    const { result } = montar();
    act(() => result.current.elegirPlantilla(false));
    for (let i = 0; i < 12; i++) act(() => result.current.agregarOpcion());
    expect(result.current.opciones).toHaveLength(10);
    for (let i = 0; i < 12; i++) act(() => result.current.quitarOpcion(0));
    expect(result.current.opciones).toHaveLength(2);
  });

  it("al crear bien limpia el formulario; al fallar lo conserva", async () => {
    const bien = montar(true);
    act(() => bien.result.current.escribirTexto("¿Aprueba el orden del día?"));
    await act(() => bien.result.current.enviar());
    expect(bien.result.current.texto).toBe("");

    const mal = montar(false);
    act(() => mal.result.current.escribirTexto("¿Aprueba el orden del día?"));
    await act(() => mal.result.current.enviar());
    expect(mal.result.current.texto).toBe("¿Aprueba el orden del día?");
  });
});
