// @vitest-environment jsdom
import { TemaProvider } from "@kuorum/ui";
import { cleanup, render as renderizar, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactElement } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { CodigosEnVivo } from "../../src/vistas/mesa/codigos-en-vivo";
import { EntregarEnVivo } from "../../src/vistas/mesa/entregar-en-vivo";
import { HojaDeCodigos } from "../../src/vistas/mesa/hoja-de-codigos";
import { CODIGOS_POR_HOJA, dividirEnHojas } from "../../src/vistas/mesa/hojas-de-codigos";
import { enlaceDeCodigo } from "../../src/vistas/mesa/textos";
import { violacionesDeAxe } from "../proyeccion/axe";

const render = (ui: ReactElement) => renderizar(ui, { wrapper: TemaProvider });
const SESION = { id: "s1", titulo: "Asamblea", codigo: "K7F2" };
const ORIGEN = "https://kuorum.test";

beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});
afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-tema");
});

function codigos(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `AAAA-${String(i).padStart(4, "0")}`);
}

function fetchDeCodigos() {
  return vi.fn<typeof fetch>(async (_url, opciones) => {
    const { cantidad } = JSON.parse(String((opciones as RequestInit).body)) as { cantidad: number };
    return Response.json({ codigos: codigos(cantidad) });
  });
}

describe("dividirEnHojas", () => {
  it("40 por hoja carta", () => {
    expect(CODIGOS_POR_HOJA).toBe(40);
    expect(dividirEnHojas(codigos(40))).toHaveLength(1);
    expect(dividirEnHojas(codigos(41)).map((h) => h.length)).toEqual([40, 1]);
    expect(dividirEnHojas(codigos(100)).map((h) => h.length)).toEqual([40, 40, 20]);
    expect(dividirEnHojas([])).toEqual([]);
  });
});

describe("enlaceDeCodigo", () => {
  it("apunta a la sala con el código en ?c=", () => {
    expect(enlaceDeCodigo(ORIGEN, "K7F2", "ABCD-EFGH")).toBe(
      "https://kuorum.test/s/K7F2?c=ABCD-EFGH",
    );
  });
});

describe("HojaDeCodigos", () => {
  it("una hoja por cada 40, cada código con su QR y su instrucción", () => {
    render(<HojaDeCodigos codigos={codigos(41)} codigoDeSala="K7F2" origen={ORIGEN} />);
    const hojas = screen.getAllByRole("region");
    expect(hojas).toHaveLength(2);
    expect(within(hojas[0] as HTMLElement).getAllByRole("article")).toHaveLength(40);
    expect(within(hojas[1] as HTMLElement).getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText("AAAA-0000")).toBeTruthy();
    expect(screen.getByRole("img", { name: "QR del código AAAA-0040" })).toBeTruthy();
    expect(
      screen.getAllByText(/Escanea o escribe el código en kuorum\.test\/s\/K7F2/),
    ).toHaveLength(41);
  });

  it("el CSS de impresión fija hoja carta, 4 columnas y salto de página", () => {
    const css = readFileSync(
      join(import.meta.dirname, "../../src/vistas/mesa/mesa.module.css"),
      "utf8",
    );
    expect(css).toMatch(/@page\s*\{[^}]*size:\s*letter/);
    expect(css).toMatch(/grid-template-columns:\s*repeat\(4,\s*1fr\)/);
    expect(css).toMatch(/break-after:\s*page/);
    const instruccion = /\.instruccion\s*\{[^}]*font-size:\s*([\d.]+)pt/.exec(css)?.[1];
    expect(Number(instruccion)).toBeGreaterThanOrEqual(9);
    expect(css).toMatch(/\.noImprimir\s*\{\s*display:\s*none\s*!important/);
  });
});

describe("CodigosEnVivo", () => {
  it("genera la cantidad pedida y muestra el aviso de una sola vez", async () => {
    const fetchFalso = fetchDeCodigos();
    render(<CodigosEnVivo sesion={SESION} dependencias={{ fetch: fetchFalso, origen: ORIGEN }} />);
    const campo = screen.getByLabelText(/Cantidad de códigos/);
    await userEvent.clear(campo);
    await userEvent.type(campo, "45");
    await userEvent.click(screen.getByRole("button", { name: "Generar" }));
    expect(
      await screen.findByText(
        "Estos códigos se muestran una sola vez. Imprímelos o entrégalos ahora.",
      ),
    ).toBeTruthy();
    expect(screen.getAllByRole("article")).toHaveLength(45);
    expect(JSON.parse(String(fetchFalso.mock.calls[0]?.[1]?.body))).toEqual({ cantidad: 45 });
    expect(fetchFalso.mock.calls[0]?.[0]).toBe("/api/mesa/v1/sesiones/s1/codigos");
    expect(window.localStorage.length).toBe(0);
    expect(window.location.search).toBe("");
  });

  it("imprimir llama a window.print", async () => {
    const imprimir = vi.spyOn(window, "print").mockImplementation(() => undefined);
    render(
      <CodigosEnVivo sesion={SESION} dependencias={{ fetch: fetchDeCodigos(), origen: ORIGEN }} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Generar" }));
    await userEvent.click(await screen.findByRole("button", { name: "Imprimir" }));
    expect(imprimir).toHaveBeenCalled();
  });

  it("borrar de la pantalla quita los códigos y vuelve al formulario", async () => {
    render(
      <CodigosEnVivo sesion={SESION} dependencias={{ fetch: fetchDeCodigos(), origen: ORIGEN }} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Generar" }));
    await userEvent.click(await screen.findByRole("button", { name: "Borrar de la pantalla" }));
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Generar" })).toBeTruthy();
  });

  it("una cantidad fuera de rango muestra el error y no llama", async () => {
    const fetchFalso = fetchDeCodigos();
    render(<CodigosEnVivo sesion={SESION} dependencias={{ fetch: fetchFalso, origen: ORIGEN }} />);
    const campo = screen.getByLabelText(/Cantidad de códigos/);
    await userEvent.clear(campo);
    await userEvent.type(campo, "3000");
    await userEvent.click(screen.getByRole("button", { name: "Generar" }));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Escribe una cantidad entre 1 y 2000.",
    );
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  for (const tema of ["claro", "oscuro"] as const) {
    it(`sin violaciones de accesibilidad, formulario y lista (${tema})`, async () => {
      document.documentElement.setAttribute("data-tema", tema);
      const { baseElement } = render(
        <CodigosEnVivo
          sesion={SESION}
          dependencias={{ fetch: fetchDeCodigos(), origen: ORIGEN }}
        />,
      );
      expect(await violacionesDeAxe(baseElement)).toEqual([]);
      await userEvent.click(screen.getByRole("button", { name: "Generar" }));
      await screen.findAllByRole("article");
      expect(await violacionesDeAxe(baseElement)).toEqual([]);
    });
  }
});

describe("EntregarEnVivo", () => {
  it("al principio pide mostrar el primero y cuenta cero", () => {
    render(
      <EntregarEnVivo sesion={SESION} dependencias={{ fetch: fetchDeCodigos(), origen: ORIGEN }} />,
    );
    expect(screen.getByRole("button", { name: "Mostrar el primer código" })).toBeTruthy();
    expect(screen.getByText("Entregados en esta pantalla: 0")).toBeTruthy();
    expect(
      screen.getByText(/Los códigos que no entregues siguen vigentes y sin usar/),
    ).toBeTruthy();
  });

  it("muestra un código a la vez con su QR, de a lotes de 50, y cuenta", async () => {
    const fetchFalso = fetchDeCodigos();
    render(<EntregarEnVivo sesion={SESION} dependencias={{ fetch: fetchFalso, origen: ORIGEN }} />);
    await userEvent.click(screen.getByRole("button", { name: "Mostrar el primer código" }));
    expect(await screen.findByText("AAAA-0000")).toBeTruthy();
    expect(screen.getByRole("img", { name: "QR del código AAAA-0000" })).toBeTruthy();
    expect(JSON.parse(String(fetchFalso.mock.calls[0]?.[1]?.body))).toEqual({ cantidad: 50 });
    await userEvent.click(screen.getByRole("button", { name: "Siguiente código" }));
    await waitFor(() => expect(screen.getByText("AAAA-0001")).toBeTruthy());
    expect(screen.queryByText("AAAA-0000")).toBeNull();
    expect(screen.getByText("Entregados en esta pantalla: 2")).toBeTruthy();
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });

  it("si falla el lote muestra el error", async () => {
    const fallido = vi.fn<typeof fetch>(async () =>
      Response.json({ error: "SESION_NO_ENCONTRADA" }, { status: 404 }),
    );
    render(<EntregarEnVivo sesion={SESION} dependencias={{ fetch: fallido, origen: ORIGEN }} />);
    await userEvent.click(screen.getByRole("button", { name: "Mostrar el primer código" }));
    expect((await screen.findByRole("alert")).textContent).toBe("No encontramos esa sesión.");
  });

  for (const tema of ["claro", "oscuro"] as const) {
    it(`sin violaciones de accesibilidad con un código en pantalla (${tema})`, async () => {
      document.documentElement.setAttribute("data-tema", tema);
      const { baseElement } = render(
        <EntregarEnVivo
          sesion={SESION}
          dependencias={{ fetch: fetchDeCodigos(), origen: ORIGEN }}
        />,
      );
      expect(await violacionesDeAxe(baseElement)).toEqual([]);
      await userEvent.click(screen.getByRole("button", { name: "Mostrar el primer código" }));
      await screen.findByText("AAAA-0000");
      expect(await violacionesDeAxe(baseElement)).toEqual([]);
    });
  }
});
