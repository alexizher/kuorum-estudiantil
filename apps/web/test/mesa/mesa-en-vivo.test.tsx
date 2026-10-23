// @vitest-environment jsdom
import { TemaProvider } from "@kuorum/ui";
import { cleanup, fireEvent, render as renderizar, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { MesaEnVivo } from "../../src/vistas/mesa/mesa-en-vivo";
import { SesionEnVivo } from "../../src/vistas/mesa/sesion-en-vivo";
import { violacionesDeAxe } from "../proyeccion/axe";
import { salaVacia } from "../proyeccion/estados";
import type { InstitucionDeMesa } from "../../src/vistas/mesa/cliente-de-mesa";
import { INSTITUCION, sesionDeLista } from "./falsos";

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

const sesion = sesionDeLista({ titulo: "Asamblea General" });

function fetchDeLaLista(
  sesiones: unknown[] = [sesion],
  opciones: { institucion?: InstitucionDeMesa; cruces?: unknown[] } = {},
) {
  return vi.fn<typeof fetch>(async (url, pedido) => {
    const ruta = String(url);
    if (ruta === "/api/mesa/v1/sesiones" && pedido?.method === "POST") {
      return Response.json({ ...sesion, id: "s2" }, { status: 201 });
    }
    if (ruta === "/api/mesa/v1/institucion") {
      return Response.json(opciones.institucion ?? INSTITUCION);
    }
    if (ruta.startsWith("/api/mesa/v1/cruces"))
      return Response.json({ cruces: opciones.cruces ?? [] });
    return Response.json({ sesiones });
  });
}

const llamadasDeLista = (f: ReturnType<typeof fetchDeLaLista>) =>
  f.mock.calls.filter(
    (c) => String(c[0]).startsWith("/api/mesa/v1/sesiones") && c[1]?.method === "GET",
  );

function elegirHorario(fecha: string, desde: string, hasta: string) {
  fireEvent.change(screen.getByLabelText("Fecha"), { target: { value: fecha } });
  fireEvent.change(screen.getByLabelText("Desde"), { target: { value: desde } });
  fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: hasta } });
}

describe("MesaEnVivo", () => {
  it("lista las sesiones con título, sala, cuerpo, fecha y hora local, estado y modo", async () => {
    render(<MesaEnVivo dependencias={{ fetch: fetchDeLaLista() }} />);
    const enlace = await screen.findByRole("link", { name: /Asamblea General/ });
    expect(enlace.getAttribute("href")).toBe("/mesa/sesiones/s1");
    expect(enlace.textContent).toContain("K7F2");
    expect(enlace.textContent).toContain("En curso");
    expect(enlace.textContent).toContain("Con códigos");
    expect(enlace.textContent).toContain("Asamblea general");
    expect(enlace.textContent).toContain("3 nov 2026, 14:00");
  });

  it("una cuenta del personal sin cuerpos ve a quién pedírselos", async () => {
    render(<MesaEnVivo sinCuerpos dependencias={{ fetch: fetchDeLaLista([]) }} />);
    expect(await screen.findByText(/Todavía no tienes cuerpos asignados/)).toBeTruthy();
  });

  it("la cabecera enlaza al calendario; institución y personal solo para la administración", async () => {
    const { rerender } = render(<MesaEnVivo dependencias={{ fetch: fetchDeLaLista() }} />);
    await screen.findByRole("link", { name: /Asamblea/ });
    const navegacion = () => screen.getByRole("navigation", { name: "Secciones de la mesa" });
    expect(navegacion().textContent).toContain("Calendario");
    expect(navegacion().textContent).toContain("Mi cuenta");
    expect(navegacion().textContent).not.toContain("Institución");
    rerender(<MesaEnVivo esAdministrador dependencias={{ fetch: fetchDeLaLista() }} />);
    expect(screen.getByRole("link", { name: "Institución" }).getAttribute("href")).toBe(
      "/mesa/institucion",
    );
    expect(screen.getByRole("link", { name: "Personal" }).getAttribute("href")).toBe(
      "/mesa/personal",
    );
    rerender(<MesaEnVivo esDemo dependencias={{ fetch: fetchDeLaLista() }} />);
    expect(navegacion().textContent).not.toContain("Mi cuenta");
  });

  it("sin sesiones lo dice", async () => {
    render(<MesaEnVivo dependencias={{ fetch: fetchDeLaLista([]) }} />);
    expect(await screen.findByText(/Todavía no hay sesiones/)).toBeTruthy();
  });

  it("explica los dos modos y arranca con 180 segundos", async () => {
    render(<MesaEnVivo dependencias={{ fetch: fetchDeLaLista() }} />);
    expect(await screen.findByText("Un voto por código, para decisiones.")).toBeTruthy();
    expect(screen.getByText("Un voto por navegador, votación indicativa.")).toBeTruthy();
    expect((screen.getByLabelText("Segundos por intervención") as HTMLInputElement).value).toBe(
      "180",
    );
    expect((screen.getByRole("radio", { name: /Con códigos/ }) as HTMLInputElement).checked).toBe(
      true,
    );
    await screen.findByRole("link", { name: /Asamblea/ });
  });

  it("crea una sesión con cuerpo, fecha, horas, modalidad y lugar, y recarga la lista", async () => {
    const fetchFalso = fetchDeLaLista();
    render(<MesaEnVivo dependencias={{ fetch: fetchFalso }} />);
    await screen.findByRole("link", { name: /Asamblea/ });
    await userEvent.type(screen.getByLabelText("Título"), "Consejo de facultad");
    await userEvent.selectOptions(await screen.findByLabelText("Cuerpo"), "Artes");
    elegirHorario("2026-11-03", "23:30", "01:00");
    await userEvent.click(screen.getByRole("radio", { name: /Mixta/ }));
    await userEvent.type(screen.getByLabelText("Lugar (opcional)"), "Auditorio");
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
        cuerpoId: "c-a",
        inicio: "2026-11-03T23:30",
        fin: "2026-11-04T01:00",
        modalidad: "MIXTA",
        lugar: "Auditorio",
      });
    });
    await waitFor(() => expect(llamadasDeLista(fetchFalso)).toHaveLength(2));
    expect((screen.getByLabelText("Título") as HTMLInputElement).value).toBe("");
  });

  it("solo ofrece los cuerpos donde la cuenta puede programar", async () => {
    render(<MesaEnVivo dependencias={{ fetch: fetchDeLaLista() }} />);
    const selector = (await screen.findByLabelText("Cuerpo")) as HTMLSelectElement;
    expect([...selector.options].map((o) => o.textContent)).toEqual(["Asamblea general", "Artes"]);
  });

  it("con un solo cuerpo posible, lo deja fijo y a la vista", async () => {
    const soloArtes = {
      ...INSTITUCION,
      cuerpos: INSTITUCION.cuerpos.map((c) => ({ ...c, puedeProgramar: c.id === "c-a" })),
    };
    render(<MesaEnVivo dependencias={{ fetch: fetchDeLaLista([], { institucion: soloArtes }) }} />);
    expect(await screen.findByText("Artes")).toBeTruthy();
    expect(screen.queryByLabelText("Cuerpo")).toBeNull();
  });

  it("sin cuerpos donde programar no muestra el formulario", async () => {
    const ninguno = {
      ...INSTITUCION,
      cuerpos: INSTITUCION.cuerpos.map((c) => ({ ...c, puedeProgramar: false })),
    };
    render(<MesaEnVivo dependencias={{ fetch: fetchDeLaLista([], { institucion: ninguno }) }} />);
    expect(await screen.findByText(/No puedes programar sesiones/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Crear sesión" })).toBeNull();
  });

  it("avisa de los cruces y deja crear igual", async () => {
    const cruce = {
      id: "s9",
      titulo: "Asamblea de Medicina",
      cuerpo: "Medicina",
      inicioLocal: "2026-11-03T15:00",
      finLocal: "2026-11-03T17:00",
    };
    const fetchFalso = fetchDeLaLista([sesion], { cruces: [cruce] });
    render(<MesaEnVivo dependencias={{ fetch: fetchFalso }} />);
    await screen.findByLabelText("Cuerpo");
    await userEvent.type(screen.getByLabelText("Título"), "Consejo de facultad");
    elegirHorario("2026-11-03", "14:00", "16:00");
    const aviso = await screen.findByText(/Se cruza con/);
    expect(aviso.closest("[role=status]")?.textContent).toContain(
      "Asamblea de Medicina (Medicina), 3 nov 2026, 15:00 a 17:00",
    );
    expect(screen.getByText("Puedes guardarla igual.")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Crear sesión" }));
    await waitFor(() =>
      expect(fetchFalso.mock.calls.some((c) => c[1]?.method === "POST")).toBe(true),
    );
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
      return String(url) === "/api/mesa/v1/institucion"
        ? Response.json(INSTITUCION)
        : Response.json({ sesiones: [] });
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
