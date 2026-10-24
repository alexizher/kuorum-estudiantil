// @vitest-environment jsdom
import { TemaProvider } from "@kuorum/ui";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BarraPublica } from "../src/components/barra-publica";
import { CabeceraDeMesa } from "../src/vistas/mesa/cabecera-de-mesa";

afterEach(() => {
  cleanup();
});

function enlaces(nombre: string) {
  return within(screen.getByRole("navigation", { name: nombre })).getAllByRole("link");
}

describe("barra pública", () => {
  it("marca la sección actual y trae el interruptor de tema", () => {
    render(<BarraPublica actual="calendario" />, { wrapper: TemaProvider });
    const actuales = enlaces("Secciones").filter((a) => a.getAttribute("aria-current") === "page");
    expect(actuales.map((a) => a.textContent)).toEqual(["Calendario"]);
    expect(screen.getByRole("switch", { name: "Tema oscuro" })).toBeTruthy();
  });
});

describe("cabecera de la mesa", () => {
  it("el administrador ve todas las secciones y la actual queda marcada", () => {
    render(<CabeceraDeMesa titulo="Personal" actual="personal" esAdministrador />);
    expect(enlaces("Secciones de la mesa").map((a) => a.textContent)).toEqual([
      "Sesiones",
      "Institución",
      "Personal",
      "Mi cuenta",
      "Calendario",
    ]);
    expect(screen.getByRole("link", { name: "Personal" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(screen.getByRole("heading", { level: 1, name: "Personal" })).toBeTruthy();
  });

  it("la cuenta de prueba no ve Mi cuenta ni las secciones de administración", () => {
    render(<CabeceraDeMesa titulo="Mesa" actual="sesiones" esDemo />);
    expect(enlaces("Secciones de la mesa").map((a) => a.textContent)).toEqual([
      "Sesiones",
      "Calendario",
    ]);
  });
});
