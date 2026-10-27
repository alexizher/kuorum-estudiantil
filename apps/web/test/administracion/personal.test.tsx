// @vitest-environment jsdom
import { TemaProvider } from "@kuorum/ui";
import { cleanup, render as renderizar, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PersonalEnVivo } from "@/vistas/administracion/personal-en-vivo";
import { violacionesDeAxe } from "../proyeccion/axe";

const render = (ui: ReactElement) => renderizar(ui, { wrapper: TemaProvider });
afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-tema");
});

const INSTITUCION = {
  institucion: {
    nombre: "U",
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
      nombre: "Vieja",
      slug: "vieja",
      tipo: "FACULTAD",
      archivado: true,
      puedeProgramar: false,
    },
  ],
};
const PERSONAL = [
  {
    id: "u-ana",
    nombre: "Ana",
    correo: "ana@x.test",
    membresias: [{ cuerpoId: "c-a", rol: "MESA" }],
  },
];

function servidor() {
  return vi.fn<typeof fetch>(async (url, pedido) => {
    const clave = `${pedido?.method ?? "GET"} ${String(url)}`;
    if (clave === "GET /api/mesa/v1/institucion") return Response.json(INSTITUCION);
    if (clave === "GET /api/mesa/v1/personal") return Response.json({ personal: PERSONAL });
    if (clave === "POST /api/mesa/v1/personal") {
      return Response.json(
        { usuarioId: "u-luis", contrasena: "clave-generada-123" },
        { status: 201 },
      );
    }
    if (clave === "POST /api/mesa/v1/personal/u-ana/contrasena") {
      return Response.json({ contrasena: "otra-clave-456789" });
    }
    return new Response(null, { status: 204 });
  });
}

const llamada = (f: ReturnType<typeof servidor>, metodo: string, ruta: string) =>
  f.mock.calls.find((c) => c[1]?.method === metodo && String(c[0]) === ruta);

describe("PersonalEnVivo", () => {
  it("lista cada persona con sus cuerpos y su rol", async () => {
    render(<PersonalEnVivo dependencias={{ fetch: servidor() }} />);
    const ana = await screen.findByRole("article", { name: "Ana" });
    expect(ana.textContent).toContain("ana@x.test");
    expect(within(ana).getByText("Artes")).toBeTruthy();
    expect((within(ana).getByLabelText("Rol en Artes") as HTMLSelectElement).value).toBe("MESA");
  });

  it("al agregar una persona muestra la contraseña una sola vez", async () => {
    const f = servidor();
    render(<PersonalEnVivo dependencias={{ fetch: f }} />);
    await screen.findByRole("article", { name: "Ana" });
    await userEvent.type(screen.getByLabelText("Correo"), "luis@x.test");
    await userEvent.type(screen.getByLabelText("Nombre"), "Luis");
    await userEvent.click(screen.getByRole("button", { name: "Agregar persona" }));
    expect(JSON.parse(String(llamada(f, "POST", "/api/mesa/v1/personal")?.[1]?.body))).toEqual({
      correo: "luis@x.test",
      nombre: "Luis",
    });
    expect(await screen.findByText("clave-generada-123")).toBeTruthy();
    expect(screen.getByText(/No se vuelve a mostrar/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Ya la entregué" }));
    await waitFor(() => expect(screen.queryByText("clave-generada-123")).toBeNull());
  });

  it("cambiar el rol, agregar un cuerpo y quitarlo llaman a la API", async () => {
    const f = servidor();
    render(<PersonalEnVivo dependencias={{ fetch: f }} />);
    const ana = await screen.findByRole("article", { name: "Ana" });
    await userEvent.selectOptions(within(ana).getByLabelText("Rol en Artes"), "ENCARGADO");
    await waitFor(() =>
      expect(
        JSON.parse(String(llamada(f, "PUT", "/api/mesa/v1/personal/u-ana/membresias")?.[1]?.body)),
      ).toEqual({ cuerpoId: "c-a", rol: "ENCARGADO" }),
    );
    const cuerpos = within(ana).getByLabelText("Agregar a") as HTMLSelectElement;
    expect([...cuerpos.options].map((o) => o.textContent)).toEqual(["Asamblea general"]);
    await userEvent.click(within(ana).getByRole("button", { name: "Agregar" }));
    await waitFor(() =>
      expect(
        f.mock.calls
          .filter((c) => c[1]?.method === "PUT")
          .map((c) => JSON.parse(String(c[1]?.body))),
      ).toContainEqual({ cuerpoId: "c-g", rol: "MESA" }),
    );
    await userEvent.click(within(ana).getByRole("button", { name: "Quitar de Artes" }));
    await waitFor(() =>
      expect(
        llamada(f, "DELETE", "/api/mesa/v1/personal/u-ana/membresias?cuerpo=c-a"),
      ).toBeDefined(),
    );
  });

  it("generar contraseña nueva la muestra una vez", async () => {
    render(<PersonalEnVivo dependencias={{ fetch: servidor() }} />);
    const ana = await screen.findByRole("article", { name: "Ana" });
    await userEvent.click(within(ana).getByRole("button", { name: "Generar contraseña nueva" }));
    expect(await screen.findByText("otra-clave-456789")).toBeTruthy();
  });

  for (const tema of ["claro", "oscuro"] as const) {
    it(`sin violaciones de accesibilidad (${tema})`, async () => {
      document.documentElement.setAttribute("data-tema", tema);
      const { baseElement } = render(<PersonalEnVivo dependencias={{ fetch: servidor() }} />);
      await screen.findByRole("article", { name: "Ana" });
      expect(await violacionesDeAxe(baseElement)).toEqual([]);
    });
  }
});
