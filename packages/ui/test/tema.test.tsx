import { act, render, renderHook, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CLAVE_DE_TEMA,
  SCRIPT_DE_TEMA,
  SelectorDeTema,
  TemaProvider,
  siguienteTema,
  useTema,
} from "../src/index.js";

function simularSistema(oscuro: boolean) {
  const oyentes = new Set<() => void>();
  const consulta = {
    matches: oscuro,
    media: "(prefers-color-scheme: dark)",
    addEventListener: (_: string, f: () => void) => oyentes.add(f),
    removeEventListener: (_: string, f: () => void) => oyentes.delete(f),
  };
  vi.stubGlobal("matchMedia", () => consulta);
  return {
    cambiar(nuevo: boolean) {
      consulta.matches = nuevo;
      oyentes.forEach((f) => f());
    },
  };
}

const envoltorio = ({ children }: { children: ReactNode }) => (
  <TemaProvider>{children}</TemaProvider>
);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("tema", () => {
  it("sin preferencia guardada es sistema y no fija data-tema", () => {
    simularSistema(false);
    const { result } = renderHook(() => useTema(), { wrapper: envoltorio });
    expect(result.current.tema).toBe("sistema");
    expect(result.current.temaEfectivo).toBe("claro");
    expect(document.documentElement.hasAttribute("data-tema")).toBe(false);
  });

  it("en sistema respeta prefers-color-scheme y reacciona a su cambio", () => {
    const sistema = simularSistema(true);
    const { result } = renderHook(() => useTema(), { wrapper: envoltorio });
    expect(result.current.temaEfectivo).toBe("oscuro");
    act(() => sistema.cambiar(false));
    expect(result.current.temaEfectivo).toBe("claro");
  });

  it("lo elegido se guarda, se aplica y persiste al montar de nuevo", () => {
    simularSistema(false);
    const primero = renderHook(() => useTema(), { wrapper: envoltorio });
    act(() => primero.result.current.cambiar("oscuro"));
    expect(localStorage.getItem(CLAVE_DE_TEMA)).toBe("oscuro");
    expect(document.documentElement.getAttribute("data-tema")).toBe("oscuro");
    primero.unmount();

    const segundo = renderHook(() => useTema(), { wrapper: envoltorio });
    expect(segundo.result.current.tema).toBe("oscuro");
    expect(segundo.result.current.temaEfectivo).toBe("oscuro");
  });

  it("volver a sistema quita data-tema", () => {
    simularSistema(false);
    const { result } = renderHook(() => useTema(), { wrapper: envoltorio });
    act(() => result.current.cambiar("claro"));
    expect(document.documentElement.getAttribute("data-tema")).toBe("claro");
    act(() => result.current.cambiar("sistema"));
    expect(document.documentElement.hasAttribute("data-tema")).toBe(false);
  });

  it("ignora un valor guardado que no es de la lista", () => {
    simularSistema(false);
    localStorage.setItem(CLAVE_DE_TEMA, "fucsia");
    const { result } = renderHook(() => useTema(), { wrapper: envoltorio });
    expect(result.current.tema).toBe("sistema");
  });

  it("sigue funcionando si localStorage lanza", () => {
    simularSistema(false);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    const { result } = renderHook(() => useTema(), { wrapper: envoltorio });
    expect(result.current.tema).toBe("sistema");
    act(() => result.current.cambiar("oscuro"));
    expect(result.current.tema).toBe("oscuro");
    expect(document.documentElement.getAttribute("data-tema")).toBe("oscuro");
    vi.restoreAllMocks();
  });

  it("el script previo al pintado aplica lo guardado", () => {
    localStorage.setItem(CLAVE_DE_TEMA, "oscuro");
    new Function(SCRIPT_DE_TEMA)();
    expect(document.documentElement.getAttribute("data-tema")).toBe("oscuro");
  });

  it("el script no falla si localStorage lanza", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    expect(() => new Function(SCRIPT_DE_TEMA)()).not.toThrow();
    expect(document.documentElement.hasAttribute("data-tema")).toBe(false);
    vi.restoreAllMocks();
  });

  it("siguienteTema alterna y vuelve a sistema cuando coincide con él", () => {
    expect(siguienteTema("claro", "claro")).toBe("oscuro");
    expect(siguienteTema("oscuro", "claro")).toBe("sistema");
    expect(siguienteTema("oscuro", "oscuro")).toBe("claro");
    expect(siguienteTema("claro", "oscuro")).toBe("sistema");
  });

  it("el interruptor sigue al sistema, fija oscuro y al volver deja de guardar preferencia", async () => {
    simularSistema(false);
    render(<SelectorDeTema />, { wrapper: envoltorio });
    const interruptor = screen.getByRole("switch", { name: "Tema oscuro" });
    expect(interruptor).toHaveProperty("ariaChecked", "false");
    await userEvent.click(interruptor);
    expect(interruptor).toHaveProperty("ariaChecked", "true");
    expect(document.documentElement.getAttribute("data-tema")).toBe("oscuro");
    expect(localStorage.getItem(CLAVE_DE_TEMA)).toBe("oscuro");
    await userEvent.click(interruptor);
    expect(interruptor).toHaveProperty("ariaChecked", "false");
    expect(document.documentElement.hasAttribute("data-tema")).toBe(false);
    expect(localStorage.getItem(CLAVE_DE_TEMA)).toBe("sistema");
  });

  it("con el sistema en oscuro el interruptor arranca encendido y fija claro", async () => {
    simularSistema(true);
    render(<SelectorDeTema />, { wrapper: envoltorio });
    const interruptor = screen.getByRole("switch", { name: "Tema oscuro" });
    expect(interruptor).toHaveProperty("ariaChecked", "true");
    await userEvent.click(interruptor);
    expect(interruptor).toHaveProperty("ariaChecked", "false");
    expect(document.documentElement.getAttribute("data-tema")).toBe("claro");
  });
});
