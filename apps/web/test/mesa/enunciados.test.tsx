// @vitest-environment jsdom
import type { EstadoDeSala } from "@kuorum/contracts";
import { TemaProvider } from "@kuorum/ui";
import { cleanup, render as renderizar, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { SesionEnVivo } from "@/vistas/mesa/sesion-en-vivo";
import { salaVacia } from "../proyeccion/estados";
import { RESULTADO } from "./falsos";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
const render = (ui: ReactElement) => renderizar(ui, { wrapper: TemaProvider });
beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});
afterEach(cleanup);

const programacion = {
  cuerpo: "Artes",
  inicioLocal: "2026-11-03T14:00",
  finLocal: "2026-11-03T16:00",
  modalidad: "PRESENCIAL" as const,
  lugar: null,
  ordenDelDia: [],
  puedeGestionar: true,
};
const sesion = (estado: string) => ({
  id: "s1",
  titulo: "Asamblea",
  codigo: "K7F2",
  modo: "CON_CODIGOS" as const,
  estado,
  programacion,
});

const cerrada = {
  id: "p1",
  texto: "¿Aprueba el informe?",
  estado: "CERRADA",
  resultadoProyectado: false,
  resultado: RESULTADO,
  opciones: [
    { id: "o1", texto: "Sí" },
    { id: "o2", texto: "No" },
  ],
};
const decision = {
  id: "d1",
  preguntaId: "p1",
  pregunta: "¿Aprueba el informe?",
  enunciado: "Se aprobó el informe",
  aprobada: true,
  indicativa: false,
  resultado: {},
};

function fetchFalso(patch?: Response, estado: EstadoDeSala["sala"]["estado"] = "CERRADA") {
  return vi.fn<typeof fetch>(async (url, init) => {
    const ruta = String(url);
    if (ruta.includes("/estado"))
      return Response.json(salaVacia({ sala: { ...salaVacia().sala, estado } }));
    if (ruta.endsWith("/preguntas")) return Response.json({ preguntas: [cerrada] });
    if (ruta.endsWith("/decisiones")) return Response.json({ decisiones: [decision] });
    if (ruta.startsWith("/api/mesa/v1/decisiones/") && init?.method === "PATCH") {
      return patch ?? new Response(null, { status: 204 });
    }
    return new Response(null, { status: 204 });
  });
}

describe("enunciado de la decisión", () => {
  it("muestra el enunciado de la votación cerrada y lo guarda", async () => {
    const f = fetchFalso();
    render(<SesionEnVivo sesion={sesion("CERRADA")} dependencias={{ fetch: f }} />);
    const campo = (await screen.findByLabelText("Enunciado")) as HTMLTextAreaElement;
    expect(campo.value).toBe("Se aprobó el informe");
    await userEvent.clear(campo);
    await userEvent.type(campo, "Informe aprobado");
    await userEvent.click(screen.getByRole("button", { name: "Guardar enunciado" }));
    await waitFor(() => {
      const llamada = f.mock.calls.find((c) => c[1]?.method === "PATCH");
      expect(String(llamada?.[0])).toBe("/api/mesa/v1/decisiones/d1");
      expect(JSON.parse(String(llamada?.[1]?.body))).toEqual({ enunciado: "Informe aprobado" });
    });
  });

  it("un enunciado vacío se envía como null", async () => {
    const f = fetchFalso();
    render(<SesionEnVivo sesion={sesion("CERRADA")} dependencias={{ fetch: f }} />);
    await userEvent.clear(await screen.findByLabelText("Enunciado"));
    await userEvent.click(screen.getByRole("button", { name: "Guardar enunciado" }));
    await waitFor(() => {
      const llamada = f.mock.calls.find((c) => c[1]?.method === "PATCH");
      expect(JSON.parse(String(llamada?.[1]?.body))).toEqual({ enunciado: null });
    });
  });

  it("muestra el mensaje de la API con role alert", async () => {
    const f = fetchFalso(
      Response.json(
        { error: "ACTA_FINALIZADA", mensaje: "El acta ya está finalizada." },
        { status: 409 },
      ),
    );
    render(<SesionEnVivo sesion={sesion("CERRADA")} dependencias={{ fetch: f }} />);
    await screen.findByLabelText("Enunciado");
    await userEvent.click(screen.getByRole("button", { name: "Guardar enunciado" }));
    const alerta = await screen.findByText("El acta ya está finalizada.");
    expect(alerta.getAttribute("role")).toBe("alert");
  });

  it("con el acta final queda deshabilitado y explica por qué", async () => {
    render(
      <SesionEnVivo
        sesion={sesion("ACTA_FINAL")}
        dependencias={{ fetch: fetchFalso(undefined, "ACTA_FINAL") }}
      />,
    );
    const campo = (await screen.findByLabelText("Enunciado")) as HTMLTextAreaElement;
    expect(campo.disabled).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Guardar enunciado" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    const item = campo.closest("li") as HTMLElement;
    expect(within(item).getByText(/acta está finalizada/i)).toBeTruthy();
  });

  it("las votaciones que no están cerradas no tienen enunciado", async () => {
    const f = vi.fn<typeof fetch>(async (url) => {
      const ruta = String(url);
      if (ruta.includes("/estado")) return Response.json(salaVacia());
      if (ruta.endsWith("/preguntas"))
        return Response.json({ preguntas: [{ ...cerrada, estado: "BORRADOR", resultado: null }] });
      return new Response(null, { status: 204 });
    });
    render(<SesionEnVivo sesion={sesion("EN_CURSO")} dependencias={{ fetch: f }} />);
    await screen.findByText("¿Aprueba el informe?");
    expect(screen.queryByLabelText("Enunciado")).toBeNull();
  });

  it("la cabecera enlaza el acta solo cuando la sesión terminó", async () => {
    const { unmount } = render(
      <SesionEnVivo sesion={sesion("CERRADA")} dependencias={{ fetch: fetchFalso() }} />,
    );
    const enlace = await screen.findByRole("link", { name: "Acta" });
    expect(enlace.getAttribute("href")).toBe("/mesa/sesiones/s1/acta");
    unmount();
    render(
      <SesionEnVivo
        sesion={sesion("EN_CURSO")}
        dependencias={{ fetch: fetchFalso(undefined, "EN_CURSO") }}
      />,
    );
    await screen.findByRole("button", { name: "Terminar sesión" });
    expect(screen.queryByRole("link", { name: "Acta" })).toBeNull();
  });
});
