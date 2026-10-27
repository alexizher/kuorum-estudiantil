// @vitest-environment jsdom
import { TemaProvider } from "@kuorum/ui";
import { cleanup, render as renderizar, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InstitucionEnVivo } from "@/vistas/administracion/institucion-en-vivo";
import { violacionesDeAxe } from "../proyeccion/axe";

const render = (ui: ReactElement) => renderizar(ui, { wrapper: TemaProvider });
afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-tema");
});

const DATOS = {
  institucion: {
    nombre: "Universidad de Ejemplo",
    tipoDeCuerpoSingular: "Facultad",
    tipoDeCuerpoPlural: "Facultades",
    zonaHoraria: "America/Bogota",
  },
  cuerpos: [
    {
      id: "c-g",
      nombre: "Asamblea general",
      slug: "asamblea-general",
      tipo: "GENERAL",
      archivado: false,
      puedeProgramar: true,
    },
    {
      id: "c-a",
      nombre: "Artes",
      slug: "artes",
      tipo: "FACULTAD",
      archivado: false,
      puedeProgramar: true,
    },
    {
      id: "c-v",
      nombre: "Escuela vieja",
      slug: "escuela-vieja",
      tipo: "FACULTAD",
      archivado: true,
      puedeProgramar: false,
    },
  ],
};

function servidor(respuestas: Record<string, () => Response> = {}) {
  return vi.fn<typeof fetch>(async (url, pedido) => {
    const clave = `${pedido?.method ?? "GET"} ${String(url)}`;
    const respuesta = respuestas[clave];
    if (respuesta) return respuesta();
    if (clave === "GET /api/mesa/v1/institucion") return Response.json(DATOS);
    return new Response(null, { status: 204 });
  });
}

const cuerpoDe = (f: ReturnType<typeof servidor>, clave: string) => {
  const llamada = f.mock.calls.find((c) => `${c[1]?.method ?? "GET"} ${String(c[0])}` === clave);
  return llamada ? JSON.parse(String(llamada[1]?.body)) : undefined;
};

describe("InstitucionEnVivo", () => {
  it("guardar manda solo lo que cambió", async () => {
    const f = servidor();
    render(<InstitucionEnVivo dependencias={{ fetch: f }} />);
    const nombre = await screen.findByLabelText("Nombre de la institución");
    await userEvent.clear(nombre);
    await userEvent.type(nombre, "Universidad Nueva");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(cuerpoDe(f, "PATCH /api/mesa/v1/institucion")).toEqual({
        nombre: "Universidad Nueva",
      }),
    );
    expect(await screen.findByText("Cambios guardados.")).toBeTruthy();
  });

  it("sin cambios no llama a la API", async () => {
    const f = servidor();
    render(<InstitucionEnVivo dependencias={{ fetch: f }} />);
    await screen.findByLabelText("Nombre de la institución");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(cuerpoDe(f, "PATCH /api/mesa/v1/institucion")).toBeUndefined();
  });

  it("la general va primero y sin archivar; los archivados van aparte", async () => {
    render(<InstitucionEnVivo dependencias={{ fetch: servidor() }} />);
    const activos = await screen.findByRole("list", { name: "Cuerpos activos" });
    const filas = within(activos).getAllByRole("listitem");
    expect(filas[0]?.textContent).toContain("Asamblea general");
    expect(within(filas[0] as HTMLElement).queryByRole("button", { name: /Archivar/ })).toBeNull();
    expect(
      within(filas[1] as HTMLElement).getByRole("button", { name: "Archivar Artes" }),
    ).toBeTruthy();
    const archivados = screen.getByRole("list", { name: "Archivados" });
    expect(archivados.textContent).toContain("Escuela vieja");
  });

  it("agrega un cuerpo con el nombre del tipo y muestra en línea si está repetido", async () => {
    const f = servidor({
      "POST /api/mesa/v1/cuerpos": () =>
        Response.json(
          { error: "CUERPO_REPETIDO", mensaje: "Ya hay un cuerpo con ese nombre." },
          { status: 409 },
        ),
    });
    render(<InstitucionEnVivo dependencias={{ fetch: f }} />);
    await userEvent.type(await screen.findByLabelText("Nombre de la nueva facultad"), "Artes");
    await userEvent.click(screen.getByRole("button", { name: "Agregar facultad" }));
    expect(cuerpoDe(f, "POST /api/mesa/v1/cuerpos")).toEqual({ nombre: "Artes" });
    expect((await screen.findByText("Ya hay un cuerpo con ese nombre.")).getAttribute("role")).toBe(
      "alert",
    );
  });

  it("renombrar y archivar (con confirmación) mandan su cambio", async () => {
    const f = servidor();
    render(<InstitucionEnVivo dependencias={{ fetch: f }} />);
    await userEvent.click(await screen.findByRole("button", { name: "Renombrar Artes" }));
    const campo = screen.getByLabelText("Nuevo nombre de Artes");
    await userEvent.clear(campo);
    await userEvent.type(campo, "Artes y Música");
    await userEvent.click(screen.getByRole("button", { name: "Guardar nombre" }));
    await waitFor(() =>
      expect(cuerpoDe(f, "PATCH /api/mesa/v1/cuerpos/c-a")).toEqual({ nombre: "Artes y Música" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Archivar Artes" }));
    await userEvent.click(await screen.findByRole("button", { name: "Sí, archivar" }));
    await waitFor(() =>
      expect(
        f.mock.calls
          .filter((c) => c[1]?.method === "PATCH" && String(c[0]).endsWith("/c-a"))
          .map((c) => JSON.parse(String(c[1]?.body))),
      ).toContainEqual({ archivado: true }),
    );
  });

  for (const tema of ["claro", "oscuro"] as const) {
    it(`sin violaciones de accesibilidad (${tema})`, async () => {
      document.documentElement.setAttribute("data-tema", tema);
      const { baseElement } = render(<InstitucionEnVivo dependencias={{ fetch: servidor() }} />);
      await screen.findByLabelText("Nombre de la institución");
      expect(await violacionesDeAxe(baseElement)).toEqual([]);
    });
  }
});
