// @vitest-environment jsdom
import { TemaProvider } from "@kuorum/ui";
import { cleanup, render as renderizar, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { MesaEnVivo } from "../../src/vistas/mesa/mesa-en-vivo";
import { SesionEnVivo } from "../../src/vistas/mesa/sesion-en-vivo";
import { violacionesDeAxe } from "../proyeccion/axe";
import { salaVacia } from "../proyeccion/estados";

const empujar = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: empujar }) }));

const render = (ui: ReactElement) => renderizar(ui, { wrapper: TemaProvider });

beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});
afterEach(() => {
  cleanup();
  empujar.mockClear();
  document.documentElement.removeAttribute("data-tema");
});

const sesion = {
  id: "s1",
  titulo: "Asamblea General",
  codigoDeSala: "K7F2",
  estado: "EN_CURSO",
  modo: "CON_CODIGOS",
  creadaEn: "2026-10-20T10:00:00.000Z",
};

function fetchDeLaLista(sesiones: unknown[] = [sesion]) {
  return vi.fn<typeof fetch>(async (url, opciones) => {
    if (String(url) === "/api/mesa/v1/sesiones" && opciones?.method === "POST") {
      return Response.json({ ...sesion, id: "s2" }, { status: 201 });
    }
    return Response.json({ sesiones });
  });
}

describe("MesaEnVivo", () => {
  it("lista las sesiones con título, sala, estado, modo y fecha, y enlaza a cada una", async () => {
    render(<MesaEnVivo dependencias={{ fetch: fetchDeLaLista() }} />);
    const enlace = await screen.findByRole("link", { name: /Asamblea General/ });
    expect(enlace.getAttribute("href")).toBe("/mesa/sesiones/s1");
    expect(enlace.textContent).toContain("K7F2");
    expect(enlace.textContent).toContain("En curso");
    expect(enlace.textContent).toContain("Con códigos");
    expect(enlace.textContent).toMatch(/oct/);
  });

  it("sin sesiones lo dice", async () => {
    render(<MesaEnVivo dependencias={{ fetch: fetchDeLaLista([]) }} />);
    expect(await screen.findByText(/Todavía no hay sesiones/)).toBeTruthy();
  });

  it("explica los dos modos y arranca con 180 segundos", async () => {
    render(<MesaEnVivo dependencias={{ fetch: fetchDeLaLista() }} />);
    expect(screen.getByText("Un voto por código, para decisiones.")).toBeTruthy();
    expect(screen.getByText("Un voto por navegador, votación indicativa.")).toBeTruthy();
    expect((screen.getByLabelText("Segundos por intervención") as HTMLInputElement).value).toBe(
      "180",
    );
    expect((screen.getByRole("radio", { name: /Con códigos/ }) as HTMLInputElement).checked).toBe(
      true,
    );
    await screen.findByRole("link", { name: /Asamblea/ });
  });

  it("crea una sesión con los datos del formulario y recarga la lista", async () => {
    const fetchFalso = fetchDeLaLista();
    render(<MesaEnVivo dependencias={{ fetch: fetchFalso }} />);
    await screen.findByRole("link", { name: /Asamblea/ });
    await userEvent.type(screen.getByLabelText("Título"), "Consejo de facultad");
    await userEvent.click(screen.getByRole("radio", { name: /Sala abierta/ }));
    const segundos = screen.getByLabelText("Segundos por intervención");
    await userEvent.clear(segundos);
    await userEvent.type(segundos, "120");
    await userEvent.click(screen.getByRole("button", { name: "Crear sesión" }));
    await waitFor(() => {
      const creacion = fetchFalso.mock.calls.find((c) => c[1]?.method === "POST");
      expect(JSON.parse(String(creacion?.[1]?.body))).toEqual({
        titulo: "Consejo de facultad",
        modo: "SALA_ABIERTA",
        segundosPorIntervencion: 120,
      });
    });
    await waitFor(() =>
      expect(fetchFalso.mock.calls.filter((c) => c[1]?.method === "GET")).toHaveLength(2),
    );
    expect((screen.getByLabelText("Título") as HTMLInputElement).value).toBe("");
  });

  it("muestra la insignia de cuenta de prueba solo si la cuenta es de prueba", async () => {
    const { rerender } = render(<MesaEnVivo dependencias={{ fetch: fetchDeLaLista() }} />);
    await screen.findByRole("link", { name: /Asamblea/ });
    expect(screen.queryByText("Cuenta de prueba")).toBeNull();

    rerender(<MesaEnVivo esDemo dependencias={{ fetch: fetchDeLaLista() }} />);
    expect(await screen.findByText("Cuenta de prueba")).toBeTruthy();
    expect(screen.getByRole("banner").textContent).toContain("Cuenta de prueba");
  });

  it("solo la superadministración ve el interruptor de la cuenta de prueba, y lo usa", async () => {
    const llamadas: string[] = [];
    const fetchConRegistro = vi.fn<typeof fetch>(async (url) => {
      llamadas.push(String(url));
      return Response.json({ sesiones: [] });
    });
    const interruptor = () => screen.queryByLabelText("Mostrar sesiones de la cuenta de prueba");

    const { rerender } = render(<MesaEnVivo dependencias={{ fetch: fetchConRegistro }} />);
    await screen.findByText(/Todavía no hay sesiones/);
    expect(interruptor()).toBeNull();

    rerender(<MesaEnVivo puedeVerCuentaDePrueba dependencias={{ fetch: fetchConRegistro }} />);
    await userEvent.click(await screen.findByLabelText("Mostrar sesiones de la cuenta de prueba"));
    await waitFor(() => expect(llamadas).toContain("/api/mesa/v1/sesiones?incluirPrueba=1"));
  });

  it("sin título muestra el error", async () => {
    render(<MesaEnVivo dependencias={{ fetch: fetchDeLaLista() }} />);
    await screen.findByRole("link", { name: /Asamblea/ });
    await userEvent.click(screen.getByRole("button", { name: "Crear sesión" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Escribe el título de la sesión.");
  });

  it("salir cierra la sesión y lleva al ingreso", async () => {
    const salir = vi.fn(async () => undefined);
    render(<MesaEnVivo dependencias={{ fetch: fetchDeLaLista(), salir }} />);
    await screen.findByRole("link", { name: /Asamblea/ });
    await userEvent.click(screen.getByRole("button", { name: "Salir" }));
    expect(salir).toHaveBeenCalled();
    await waitFor(() => expect(empujar).toHaveBeenCalledWith("/mesa/ingresar"));
  });

  for (const tema of ["claro", "oscuro"] as const) {
    it(`sin violaciones de accesibilidad (${tema})`, async () => {
      document.documentElement.setAttribute("data-tema", tema);
      const { baseElement } = render(<MesaEnVivo dependencias={{ fetch: fetchDeLaLista() }} />);
      await screen.findByRole("link", { name: /Asamblea/ });
      expect(await violacionesDeAxe(baseElement)).toEqual([]);
    });
  }
});

describe("SesionEnVivo", () => {
  it("consulta el estado público, carga las preguntas y reacciona a una acción", async () => {
    const llamadas: string[] = [];
    const fetchFalso = vi.fn<typeof fetch>(async (url, opciones) => {
      const ruta = String(url);
      llamadas.push(`${opciones?.method ?? "GET"} ${ruta}`);
      if (ruta.startsWith("/api/public/v1/salas/K7F2/estado")) {
        return Response.json(salaVacia({ sala: { ...salaVacia().sala, estado: "ABIERTA" } }));
      }
      if (ruta.endsWith("/preguntas")) return Response.json({ preguntas: [] });
      return new Response(null, { status: 204 });
    });
    render(
      <SesionEnVivo
        sesion={{
          id: "s1",
          titulo: "Asamblea",
          codigo: "K7F2",
          modo: "CON_CODIGOS",
          estado: "PROGRAMADA",
        }}
        dependencias={{ fetch: fetchFalso }}
      />,
    );
    await waitFor(() => expect(llamadas).toContain("GET /api/mesa/v1/sesiones/s1/preguntas"));
    await userEvent.click(await screen.findByRole("button", { name: "Iniciar sesión" }));
    await waitFor(() => expect(llamadas).toContain("POST /api/mesa/v1/sesiones/s1/iniciar"));
    // Tras la acción vuelve a pedir el estado sin esperar el turno ni la caché.
    await waitFor(() => expect(llamadas.filter((l) => l.includes("/estado?r="))).toHaveLength(1));
  });

  it("la cabecera de la sesión muestra la insignia solo con la cuenta de prueba", async () => {
    const fetchFalso = vi.fn<typeof fetch>(async (url) =>
      String(url).includes("/estado")
        ? Response.json(salaVacia())
        : Response.json({ preguntas: [] }),
    );
    const sesionDePrueba = {
      id: "s1",
      titulo: "Asamblea",
      codigo: "K7F2",
      modo: "SALA_ABIERTA" as const,
      estado: "PROGRAMADA",
    };
    const { rerender } = render(
      <SesionEnVivo sesion={sesionDePrueba} dependencias={{ fetch: fetchFalso }} />,
    );
    await screen.findByRole("button", { name: "Iniciar sesión" });
    expect(screen.queryByText("Cuenta de prueba")).toBeNull();

    rerender(<SesionEnVivo esDemo sesion={sesionDePrueba} dependencias={{ fetch: fetchFalso }} />);
    expect(await screen.findByText("Cuenta de prueba")).toBeTruthy();
  });
});
