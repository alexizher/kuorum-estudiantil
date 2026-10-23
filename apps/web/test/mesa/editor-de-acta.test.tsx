// @vitest-environment jsdom
import { TemaProvider } from "@kuorum/ui";
import { cleanup, render as renderizar, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditorDeActa } from "../../src/vistas/mesa/editor-de-acta";
import { violacionesDeAxe } from "../proyeccion/axe";

const render = (ui: ReactElement) => renderizar(ui, { wrapper: TemaProvider });
afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-tema");
});

const vistaPrevia = {
  institucion: "Universidad de Ejemplo",
  cuerpo: "Asamblea general",
  titulo: "Asamblea de noviembre",
  inicio: "2026-11-03T19:00:00.000Z",
  fin: "2026-11-03T21:00:00.000Z",
  zonaHoraria: "America/Bogota",
  modalidad: "MIXTA",
  lugar: "Auditorio",
  ordenDelDia: ["Quórum", "Informe"],
  asistentes: 42,
  intervenciones: 5,
  mociones: { ORDEN: 1, PROCEDIMIENTO: 0, ACLARACION: 2, SUFICIENTE_ILUSTRACION: 0 },
  desarrollo: "",
  decisiones: [
    {
      pregunta: "¿Aprueba el informe?",
      enunciado: "Se aprobó el informe",
      aprobada: true,
      indicativa: false,
      resultado: { totalVotos: 10, asistentes: 42, porOpcion: [] },
    },
  ],
};

function acta(cambios: Record<string, unknown> = {}) {
  return {
    estado: "BORRADOR",
    desarrollo: "Se abrió la sesión.",
    codigo: null,
    finalizadaEn: null,
    vistaPrevia,
    ...cambios,
  };
}

function fetchFalso(inicial = acta(), respuestas: Record<string, Response> = {}) {
  let actual = inicial;
  return vi.fn<typeof fetch>(async (url, init) => {
    const ruta = String(url);
    const metodo = init?.method ?? "GET";
    const clave = `${metodo} ${ruta}`;
    const dada = respuestas[clave];
    if (dada) return dada;
    if (metodo === "GET") return Response.json(actual);
    if (ruta.endsWith("/acta/finalizar")) {
      actual = acta({ estado: "FINAL", codigo: "ABCDE-23456" });
      return Response.json({ codigo: "ABCDE-23456" });
    }
    return new Response(null, { status: 204 });
  });
}

const montar = (f: ReturnType<typeof fetchFalso>) =>
  render(<EditorDeActa sesionId="s1" titulo="Asamblea" dependencias={{ fetch: f }} />);

describe("editor del acta", () => {
  it("muestra los campos fijos y el desarrollo", async () => {
    montar(fetchFalso());
    const area = (await screen.findByLabelText("Desarrollo")) as HTMLTextAreaElement;
    expect(area.value).toBe("Se abrió la sesión.");
    const texto = document.body.textContent ?? "";
    for (const esperado of [
      "Asamblea general",
      "Asamblea de noviembre",
      "Mixta",
      "Auditorio",
      "Quórum",
      "42",
      "Se aprobó el informe",
    ]) {
      expect(texto).toContain(esperado);
    }
  });

  it("guarda el borrador con PUT", async () => {
    const f = fetchFalso();
    montar(f);
    const area = await screen.findByLabelText("Desarrollo");
    await userEvent.clear(area);
    await userEvent.type(area, "Nuevo texto");
    await userEvent.click(screen.getByRole("button", { name: "Guardar borrador" }));
    await waitFor(() => {
      const llamada = f.mock.calls.find((c) => c[1]?.method === "PUT");
      expect(String(llamada?.[0])).toBe("/api/mesa/v1/sesiones/s1/acta");
      expect(JSON.parse(String(llamada?.[1]?.body))).toEqual({ desarrollo: "Nuevo texto" });
    });
    expect(await screen.findByText("Borrador guardado.")).toBeTruthy();
  });

  it("finalizar pide confirmación, guarda el texto, finaliza y muestra código y enlaces", async () => {
    const f = fetchFalso();
    montar(f);
    await screen.findByLabelText("Desarrollo");
    await userEvent.click(screen.getByRole("button", { name: "Finalizar acta" }));
    expect(screen.getByText(/No se podrá editar después/)).toBeTruthy();
    expect(f.mock.calls.some((c) => String(c[0]).endsWith("/finalizar"))).toBe(false);
    await userEvent.click(screen.getByRole("button", { name: "Sí, finalizar" }));
    expect(await screen.findByText("ABCDE-23456")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Descargar PDF" }).getAttribute("href")).toBe(
      "/api/public/v1/actas/s1.pdf",
    );
    expect(screen.getByRole("link", { name: "Verificar" }).getAttribute("href")).toBe(
      "/actas/verificar?codigo=ABCDE-23456",
    );
    expect(screen.queryByRole("button", { name: "Guardar borrador" })).toBeNull();
    expect((screen.getByLabelText("Desarrollo") as HTMLTextAreaElement).disabled).toBe(true);
    const metodos = f.mock.calls.map((c) => `${c[1]?.method ?? "GET"} ${String(c[0])}`);
    expect(metodos.indexOf("PUT /api/mesa/v1/sesiones/s1/acta")).toBeLessThan(
      metodos.indexOf("POST /api/mesa/v1/sesiones/s1/acta/finalizar"),
    );
  });

  it("un acta ya final se abre con código y enlaces", async () => {
    montar(fetchFalso(acta({ estado: "FINAL", codigo: "ABCDE-23456" })));
    expect(await screen.findByText("ABCDE-23456")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Descargar PDF" })).toBeTruthy();
  });

  it("muestra el mensaje de la API con role alert", async () => {
    const f = fetchFalso(acta(), {
      "PUT /api/mesa/v1/sesiones/s1/acta": Response.json(
        { error: "ACTA_FINALIZADA", mensaje: "El acta ya está finalizada." },
        { status: 409 },
      ),
    });
    montar(f);
    await screen.findByLabelText("Desarrollo");
    await userEvent.click(screen.getByRole("button", { name: "Guardar borrador" }));
    const alerta = await screen.findByText("El acta ya está finalizada.");
    expect(alerta.getAttribute("role")).toBe("alert");
  });

  for (const tema of ["claro", "oscuro"] as const) {
    it(`sin violaciones de accesibilidad (${tema})`, async () => {
      document.documentElement.setAttribute("data-tema", tema);
      montar(fetchFalso());
      await screen.findByLabelText("Desarrollo");
      expect(await violacionesDeAxe(document.body)).toEqual([]);
    });
  }
});
