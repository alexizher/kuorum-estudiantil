// @vitest-environment jsdom
import { TemaProvider } from "@kuorum/ui";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Proyeccion } from "../../src/vistas/proyeccion/proyeccion";
import { ControlesDeProyeccion } from "../../src/vistas/proyeccion/controles-de-proyeccion";
import { violacionesDeAxe } from "./axe";
import { conLaPalabra, preguntaAbierta, preguntaConResultado, salaVacia } from "./estados";

const URL_DE_ENTRADA = "https://kuorum.example/s/K7F2";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function pintar(propiedades: Parameters<typeof Proyeccion>[0]) {
  return render(
    <TemaProvider>
      <main>
        <Proyeccion {...propiedades} />
      </main>
    </TemaProvider>,
  );
}

const sinAxe = async (contenedor: HTMLElement) =>
  expect(await violacionesDeAxe(contenedor)).toEqual([]);

describe("Proyeccion", () => {
  it("cargando", async () => {
    const { container } = pintar({ vista: "cargando", segundosRestantes: null, urlDeEntrada: "" });
    expect(screen.getByRole("status").textContent).toContain("Cargando");
    await sinAxe(container);
  });

  it("no disponible", async () => {
    const { container } = pintar({
      vista: "no-disponible",
      segundosRestantes: null,
      urlDeEntrada: "",
    });
    expect(screen.getByRole("heading").textContent).toBe("Esta sala no existe o ya terminó.");
    await sinAxe(container);
  });

  it("esperando: título, código y URL corta", async () => {
    const { container } = pintar({
      vista: "esperando",
      estado: salaVacia(),
      segundosRestantes: null,
      urlDeEntrada: URL_DE_ENTRADA,
    });
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Asamblea General de Estudiantes",
    );
    expect(screen.getByText("K7F2")).toBeTruthy();
    expect(screen.getByText("kuorum.example/s/K7F2")).toBeTruthy();
    expect(screen.getByRole("img", { name: /código qr/i })).toBeTruthy();
    await sinAxe(container);
  });

  it("esperando en sala abierta no deja una cabecera vacía", () => {
    const { container } = pintar({
      vista: "esperando",
      estado: salaVacia({ asistencia: null }),
      segundosRestantes: null,
      urlDeEntrada: URL_DE_ENTRADA,
    });
    expect(container.querySelector("header")).toBeNull();
  });

  it("votación con asistencia: votos emitidos de asistentes y barra", async () => {
    const { container } = pintar({
      vista: "votacion",
      estado: salaVacia({ pregunta: preguntaAbierta() }),
      segundosRestantes: null,
      urlDeEntrada: URL_DE_ENTRADA,
    });
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("¿Aprueba");
    expect(screen.getByLabelText("Opciones").textContent).toBe("SíNoMe abstengo");
    const avance = screen.getByText(/Votos emitidos/).closest("div") as HTMLElement;
    expect(avance.textContent).toContain("812");
    expect(avance.textContent).toContain("1.284");
    expect(screen.queryByText("Votación indicativa")).toBeNull();
    await sinAxe(container);
  });

  it("votación en sala abierta: sin 'de asistentes' y con la etiqueta de indicativa", async () => {
    const { container } = pintar({
      vista: "votacion",
      estado: salaVacia({
        asistencia: null,
        sala: { ...salaVacia().sala, modo: "SALA_ABIERTA", indicativa: true },
        pregunta: preguntaAbierta(),
      }),
      segundosRestantes: null,
      urlDeEntrada: URL_DE_ENTRADA,
    });
    const avance = screen.getByText(/Votos emitidos/).closest("div") as HTMLElement;
    expect(avance.textContent).not.toContain(" de ");
    expect(screen.getByText("Votación indicativa")).toBeTruthy();
    await sinAxe(container);
  });

  it("resultados: veredicto, regla, bloques de tinta y total", async () => {
    const { container } = pintar({
      vista: "resultados",
      estado: salaVacia({ pregunta: preguntaConResultado() }),
      segundosRestantes: null,
      urlDeEntrada: URL_DE_ENTRADA,
    });
    expect(screen.getByText("Aprobada")).toBeTruthy();
    expect(screen.getByText(/Sí supera a No por/).textContent).toContain("424");
    const lista = screen.getByRole("list", { name: "Votos por opción" });
    const bloques = within(lista).getAllByRole("listitem");
    expect(bloques.map((b) => b.getAttribute("aria-label"))).toEqual([
      "Sí: 742 votos, 64,2 %",
      "No: 318 votos, 27,5 %",
      "Me abstengo: 96 votos, 8,3 %",
    ]);
    expect(screen.getByText(/votos emitidos de/).textContent).toContain("1.156");
    expect(screen.queryByText("Votación indicativa")).toBeNull();
    await sinAxe(container);
  });

  it("resultados rechazados y con indicativa", async () => {
    const { container } = pintar({
      vista: "resultados",
      estado: salaVacia({
        asistencia: null,
        sala: { ...salaVacia().sala, indicativa: true },
        pregunta: preguntaConResultado([100, 300, 5], undefined, false),
      }),
      segundosRestantes: null,
      urlDeEntrada: URL_DE_ENTRADA,
    });
    expect(screen.getByText("Rechazada")).toBeTruthy();
    expect(screen.getByText(/No supera a Sí por/).textContent).toContain("200");
    expect(screen.getByText("Votación indicativa")).toBeTruthy();
    await sinAxe(container);
  });

  it("resultados con empate entre Sí y No", () => {
    pintar({
      vista: "resultados",
      estado: salaVacia({ pregunta: preguntaConResultado([50, 50, 0], undefined, false) }),
      segundosRestantes: null,
      urlDeEntrada: URL_DE_ENTRADA,
    });
    expect(screen.getByText("Empate")).toBeTruthy();
  });

  it("resultados de una pregunta con otras opciones: ganadora y sin veredicto de aprobación", () => {
    pintar({
      vista: "resultados",
      estado: salaVacia({
        pregunta: preguntaConResultado([30, 10], ["Plancha A", "Plancha B"], null),
      }),
      segundosRestantes: null,
      urlDeEntrada: URL_DE_ENTRADA,
    });
    expect(screen.getAllByText("Plancha A")).toHaveLength(2);
    expect(screen.queryByText("Aprobada")).toBeNull();
  });

  it("palabra: orador, cronómetro y fila con mociones primero", async () => {
    const { container } = pintar({
      vista: "palabra",
      estado: salaVacia({
        palabra: {
          conLaPalabra: conLaPalabra(),
          fila: [
            { id: "a", nombre: "Juan Pablo Arango", tipo: "MOCION", mocion: "ORDEN" },
            { id: "b", nombre: "Andrés Cardona", tipo: "INTERVENCION", mocion: null },
          ],
        },
      }),
      segundosRestantes: 98,
      urlDeEntrada: URL_DE_ENTRADA,
    });
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Valentina Ríos");
    expect(screen.getByLabelText("Tiempo restante").textContent).toBe("1:38");
    const fila = within(screen.getByRole("list", { name: "Fila de la palabra" })).getAllByRole(
      "listitem",
    );
    expect(fila).toHaveLength(2);
    expect(fila[0]?.textContent).toContain("Moción de orden");
    expect(fila[0]?.textContent).toContain("Juan Pablo Arango");
    expect(fila[1]?.textContent).toContain("Andrés Cardona");
    await sinAxe(container);
  });

  it("palabra con la fila vacía", () => {
    pintar({
      vista: "palabra",
      estado: salaVacia({ palabra: { conLaPalabra: conLaPalabra(), fila: [] } }),
      segundosRestantes: 10,
      urlDeEntrada: URL_DE_ENTRADA,
    });
    expect(screen.getByText("La fila está vacía.")).toBeTruthy();
  });

  it("palabra de una moción: muestra el tipo de moción", () => {
    pintar({
      vista: "palabra",
      estado: salaVacia({
        palabra: {
          conLaPalabra: { ...conLaPalabra(), tipo: "MOCION", mocion: "ACLARACION" },
          fila: [],
        },
      }),
      segundosRestantes: 10,
      urlDeEntrada: URL_DE_ENTRADA,
    });
    expect(screen.getByText("Moción de aclaración")).toBeTruthy();
  });
});

describe("ControlesDeProyeccion", () => {
  it("se oculta tras 3 s sin mover el mouse y vuelve al moverlo", () => {
    vi.useFakeTimers();
    render(
      <TemaProvider>
        <ControlesDeProyeccion />
      </TemaProvider>,
    );
    const controles = screen.getByRole("group", { name: "Controles de la proyección" });

    act(() => vi.advanceTimersByTime(2999));
    expect(controles.getAttribute("data-visible")).toBe("true");
    act(() => vi.advanceTimersByTime(2));
    expect(controles.getAttribute("data-visible")).toBe("false");

    act(() => {
      document.dispatchEvent(new MouseEvent("mousemove"));
    });
    expect(controles.getAttribute("data-visible")).toBe("true");
    act(() => vi.advanceTimersByTime(3001));
    expect(controles.getAttribute("data-visible")).toBe("false");
  });

  it("no se oculta mientras el foco está dentro", () => {
    vi.useFakeTimers();
    render(
      <TemaProvider>
        <ControlesDeProyeccion />
      </TemaProvider>,
    );
    const controles = screen.getByRole("group", { name: "Controles de la proyección" });
    act(() => screen.getByRole("button", { name: "Claro" }).focus());
    act(() => vi.advanceTimersByTime(10_000));
    expect(controles.getAttribute("data-visible")).toBe("true");
  });

  it("'Pantalla completa' entra y sale con la API de Fullscreen", async () => {
    const entrar = vi.fn().mockResolvedValue(undefined);
    const salir = vi.fn().mockResolvedValue(undefined);
    document.documentElement.requestFullscreen = entrar;
    document.exitFullscreen = salir;
    render(
      <TemaProvider>
        <ControlesDeProyeccion />
      </TemaProvider>,
    );
    const boton = screen.getByRole("button", { name: "Pantalla completa" });
    await act(async () => boton.click());
    expect(entrar).toHaveBeenCalledOnce();

    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: document.documentElement,
    });
    await act(async () => {
      document.dispatchEvent(new Event("fullscreenchange"));
    });
    await act(async () =>
      screen.getByRole("button", { name: "Salir de pantalla completa" }).click(),
    );
    expect(salir).toHaveBeenCalledOnce();
    Object.defineProperty(document, "fullscreenElement", { configurable: true, value: null });
  });

  it("sin API de pantalla completa no muestra el botón", () => {
    // @ts-expect-error jsdom no la define; se quita por si otra prueba la dejó.
    delete document.documentElement.requestFullscreen;
    render(
      <TemaProvider>
        <ControlesDeProyeccion />
      </TemaProvider>,
    );
    expect(screen.queryByRole("button", { name: /pantalla completa/i })).toBeNull();
  });
});
