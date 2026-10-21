// @vitest-environment jsdom
import type { EstadoDeSala } from "@kuorum/contracts";
import { TemaProvider } from "@kuorum/ui";
import { cleanup, render as renderizar, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { userEvent } from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { PanelDeSesion, type PropiedadesDePanel } from "../../src/vistas/mesa/panel-de-sesion";
import type { PanelDeSesion as Panel } from "../../src/vistas/mesa/use-panel-de-sesion";
import type { FormularioDePregunta } from "../../src/vistas/mesa/use-formulario-de-pregunta";
import { violacionesDeAxe } from "../proyeccion/axe";
import {
  conLaPalabra,
  preguntaAbierta,
  preguntaConResultado,
  salaVacia,
} from "../proyeccion/estados";
import { borrador, RESULTADO } from "./falsos";

// jsdom no trae canvas; axe lo toca al comparar nombre y texto visible de los botones.
beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

const render = (ui: ReactElement) => renderizar(ui, { wrapper: TemaProvider });

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-tema");
});

function acciones() {
  return {
    iniciar: vi.fn(async () => true),
    terminar: vi.fn(async () => true),
    crearPregunta: vi.fn(async () => true),
    abrir: vi.fn(async () => true),
    cerrar: vi.fn(async () => true),
    anular: vi.fn(async () => true),
    proyectar: vi.fn(async () => true),
    darLaPalabra: vi.fn(async () => true),
    terminarIntervencion: vi.fn(async () => true),
    sumarMinuto: vi.fn(async () => true),
    rechazarMocion: vi.fn(async () => true),
  };
}

function formularioFalso(cambios: Partial<FormularioDePregunta> = {}): FormularioDePregunta {
  return {
    texto: "",
    plantilla: true,
    opciones: ["", ""],
    error: undefined,
    escribirTexto: vi.fn(),
    elegirPlantilla: vi.fn(),
    escribirOpcion: vi.fn(),
    agregarOpcion: vi.fn(),
    quitarOpcion: vi.fn(),
    enviar: vi.fn(async () => undefined),
    ...cambios,
  };
}

function propiedades(
  cambios: { panel?: Partial<Panel>; sesion?: Partial<PropiedadesDePanel["sesion"]> } = {},
  alCopiarEnlace = vi.fn(async () => true),
) {
  const a = acciones();
  const props: PropiedadesDePanel = {
    sesion: {
      id: "s1",
      titulo: "Asamblea General de Estudiantes",
      codigo: "K7F2",
      modo: "CON_CODIGOS",
      estado: "EN_CURSO",
      ...cambios.sesion,
    },
    panel: {
      estado: salaVacia(),
      disponible: true,
      sinConexion: false,
      preguntas: [],
      alerta: false,
      ocupado: false,
      error: undefined,
      reintentar: vi.fn(async () => true),
      descartarError: vi.fn(),
      acciones: a,
      ...cambios.panel,
    },
    formulario: formularioFalso(),
    segundosRestantes: null,
    alCopiarEnlace,
  };
  return { props, acciones: a, alCopiarEnlace };
}

function conFila(): EstadoDeSala {
  return salaVacia({
    palabra: {
      conLaPalabra: conLaPalabra(),
      fila: [
        { id: "m1", nombre: "Juan Pablo Arango", tipo: "MOCION", mocion: "ORDEN" },
        { id: "i1", nombre: "Andrés Cardona", tipo: "INTERVENCION", mocion: null },
      ],
    },
  });
}

describe("cabecera", () => {
  it("muestra título, sala y estado, y enlaza la proyección en pestaña nueva", () => {
    render(<PanelDeSesion {...propiedades().props} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Asamblea General de Estudiantes",
    );
    expect(screen.getByText("K7F2")).toBeTruthy();
    expect(screen.getAllByText("En curso").length).toBeGreaterThan(0);
    const enlace = screen.getByRole("link", { name: "Abrir proyección" });
    expect(enlace.getAttribute("href")).toBe("/proyeccion/K7F2");
    expect(enlace.getAttribute("target")).toBe("_blank");
  });

  it("programada ofrece iniciar y no terminar", async () => {
    const { props, acciones: a } = propiedades({
      sesion: { estado: "PROGRAMADA" },
      panel: { estado: null },
    });
    render(<PanelDeSesion {...props} />);
    expect(screen.queryByRole("button", { name: "Terminar sesión" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(a.iniciar).toHaveBeenCalled();
  });

  it("terminar pide confirmación en una hoja, no con window.confirm", async () => {
    const confirmar = vi.spyOn(window, "confirm");
    const { props, acciones: a } = propiedades();
    render(<PanelDeSesion {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Terminar sesión" }));
    const hoja = await screen.findByRole("dialog");
    expect(within(hoja).getByText(/nadie podrá votar/i)).toBeTruthy();
    expect(a.terminar).not.toHaveBeenCalled();
    await userEvent.click(within(hoja).getByRole("button", { name: "Cancelar" }));
    expect(a.terminar).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Terminar sesión" }));
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Terminar sesión" }),
    );
    expect(a.terminar).toHaveBeenCalledTimes(1);
    expect(confirmar).not.toHaveBeenCalled();
  });

  it("con una votación abierta deshabilita Terminar sesión y explica por qué", () => {
    const { props } = propiedades({
      panel: {
        preguntas: [
          {
            id: "p1",
            texto: "¿Aprobamos?",
            estado: "ABIERTA",
            opciones: [],
            resultado: null,
          } as unknown as Panel["preguntas"][number],
        ],
      },
    });
    render(<PanelDeSesion {...props} />);
    const boton = screen.getByRole("button", { name: "Terminar sesión" });
    expect((boton as HTMLButtonElement).disabled).toBe(true);
    expect(
      screen.getByText("Cierra la votación abierta para poder terminar la sesión."),
    ).toBeTruthy();
    expect(boton.getAttribute("aria-describedby")).toBe(
      screen.getByText("Cierra la votación abierta para poder terminar la sesión.").id,
    );
  });

  it("sin votación abierta no muestra el aviso y Terminar sesión está activo", () => {
    render(<PanelDeSesion {...propiedades().props} />);
    expect(
      (screen.getByRole("button", { name: "Terminar sesión" }) as HTMLButtonElement).disabled,
    ).toBe(false);
    expect(screen.queryByText(/para poder terminar la sesión/)).toBeNull();
  });

  it("copiar el enlace avisa del resultado", async () => {
    const { props, alCopiarEnlace } = propiedades();
    render(<PanelDeSesion {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Copiar enlace para participantes" }));
    expect(alCopiarEnlace).toHaveBeenCalled();
    expect((await screen.findByText("Enlace copiado.")).getAttribute("role")).toBe("status");
  });

  it("si no se pudo copiar lo dice", async () => {
    const { props } = propiedades(
      {},
      vi.fn(async () => false),
    );
    render(<PanelDeSesion {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Copiar enlace para participantes" }));
    expect(await screen.findByText(/No se pudo copiar/)).toBeTruthy();
  });
});

describe("fila de la palabra", () => {
  it("muestra quien habla con su cronómetro y las acciones", async () => {
    const { props, acciones: a } = propiedades({ panel: { estado: conFila() } });
    render(<PanelDeSesion {...props} segundosRestantes={82} />);
    expect(screen.getByText("Valentina Ríos")).toBeTruthy();
    expect(screen.getByLabelText("Tiempo restante").textContent).toBe("1:22");
    await userEvent.click(screen.getByRole("button", { name: "Terminar" }));
    await userEvent.click(screen.getByRole("button", { name: "Sumar un minuto" }));
    expect(a.terminarIntervencion).toHaveBeenCalled();
    expect(a.sumarMinuto).toHaveBeenCalled();
  });

  it("da la palabra a la siguiente o a una en particular", async () => {
    const { props, acciones: a } = propiedades({ panel: { estado: conFila() } });
    render(<PanelDeSesion {...props} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Dar la palabra a la siguiente persona de la fila" }),
    );
    expect(a.darLaPalabra).toHaveBeenLastCalledWith(undefined);
    await userEvent.click(screen.getByRole("button", { name: "Dar la palabra a Andrés Cardona" }));
    expect(a.darLaPalabra).toHaveBeenLastCalledWith("i1");
  });

  it("las mociones salen con su etiqueta y se pueden rechazar; las intervenciones no", async () => {
    const { props, acciones: a } = propiedades({ panel: { estado: conFila() } });
    render(<PanelDeSesion {...props} />);
    const filas = screen.getAllByRole("listitem");
    expect(within(filas[0] as HTMLElement).getByText("Moción de orden")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /Rechazar la moción/ })).toHaveLength(1);
    await userEvent.click(
      screen.getByRole("button", { name: "Rechazar la moción de Juan Pablo Arango" }),
    );
    expect(a.rechazarMocion).toHaveBeenCalledWith("m1");
  });

  it("fila vacía lo dice y no hay a quién dar la palabra", () => {
    render(<PanelDeSesion {...propiedades().props} />);
    expect(screen.getByText(/Nadie pidió la palabra/)).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Dar la palabra a la siguiente persona de la fila" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("sin iniciar la sesión no se da la palabra", () => {
    const programada = conFila();
    programada.sala.estado = "PROGRAMADA";
    const { props } = propiedades({
      sesion: { estado: "PROGRAMADA" },
      panel: { estado: programada },
    });
    render(<PanelDeSesion {...props} />);
    expect(screen.getByText("Inicia la sesión para dar la palabra.")).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Dar la palabra a Andrés Cardona" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });
});

describe("votación", () => {
  const abierta = { ...borrador, estado: "ABIERTA" as const };

  it("abierta muestra votos contra asistencia y permite cerrar", async () => {
    const { props, acciones: a } = propiedades({
      panel: {
        estado: salaVacia({ pregunta: preguntaAbierta() }),
        preguntas: [{ ...abierta, id: "p1" }],
      },
    });
    render(<PanelDeSesion {...props} />);
    expect(screen.getByText("812")).toBeTruthy();
    expect(screen.getByText("1.284", { selector: "span" })).toBeTruthy();
    expect(screen.getByText(/votaron/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Cerrar votación" }));
    expect(a.cerrar).toHaveBeenCalledWith("p1");
  });

  it("anular pide confirmación antes de llamar", async () => {
    const { props, acciones: a } = propiedades({
      panel: {
        estado: salaVacia({ pregunta: preguntaAbierta() }),
        preguntas: [{ ...abierta, id: "p1" }],
      },
    });
    render(<PanelDeSesion {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Anular" }));
    expect(a.anular).not.toHaveBeenCalled();
    const hoja = await screen.findByRole("dialog");
    await userEvent.click(within(hoja).getByRole("button", { name: "Anular votación" }));
    expect(a.anular).toHaveBeenCalledWith("p1");
  });

  it("cerrada ofrece proyectar; ya proyectada muestra el resultado y un aviso", async () => {
    const cerrada = { ...borrador, id: "p1", estado: "CERRADA" as const };
    const sinProyectar = propiedades({
      panel: {
        estado: salaVacia({ pregunta: { ...preguntaConResultado(), resultado: null } }),
        preguntas: [cerrada],
      },
    });
    const { unmount } = render(<PanelDeSesion {...sinProyectar.props} />);
    await userEvent.click(screen.getByRole("button", { name: "Proyectar resultado" }));
    expect(sinProyectar.acciones.proyectar).toHaveBeenCalledWith("p1");
    unmount();

    const proyectada = propiedades({
      panel: {
        estado: salaVacia({ pregunta: preguntaConResultado() }),
        preguntas: [{ ...cerrada, resultadoProyectado: true }],
      },
    });
    render(<PanelDeSesion {...proyectada.props} />);
    expect(screen.getByRole("list", { name: "Resultado" })).toBeTruthy();
    expect(screen.getByText(/Aprobada\./)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Proyectar resultado" })).toBeNull();
  });

  it("cerrada y sin proyectar muestra el conteo con su rótulo y deja proyectar", async () => {
    const cerrada = { ...borrador, id: "p1", estado: "CERRADA" as const, resultado: RESULTADO };
    const { props, acciones: a } = propiedades({
      panel: {
        estado: salaVacia({ pregunta: { ...preguntaConResultado(), resultado: null } }),
        preguntas: [cerrada],
      },
    });
    render(<PanelDeSesion {...props} />);
    expect(screen.getByText("Resultado (aún no proyectado)")).toBeTruthy();
    expect(screen.getByText("10")).toBeTruthy();
    const lista = screen.getByRole("list", { name: "Resultado" });
    expect(within(lista).getByText("7")).toBeTruthy();
    expect(within(lista).getByText("3")).toBeTruthy();
    expect(screen.getByText(/Aprobada\./)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Proyectar resultado" }));
    expect(a.proyectar).toHaveBeenCalledWith("p1");
  });

  it("ya proyectado el rótulo desaparece", () => {
    const cerrada = {
      ...borrador,
      id: "p1",
      estado: "CERRADA" as const,
      resultado: RESULTADO,
      resultadoProyectado: true,
    };
    const { props } = propiedades({
      panel: { estado: salaVacia({ pregunta: preguntaConResultado() }), preguntas: [cerrada] },
    });
    render(<PanelDeSesion {...props} />);
    expect(screen.queryByText("Resultado (aún no proyectado)")).toBeNull();
    expect(screen.getByRole("list", { name: "Resultado" })).toBeTruthy();
  });

  it("los borradores se abren desde la lista de preguntas", async () => {
    const { props, acciones: a } = propiedades({ panel: { preguntas: [borrador] } });
    render(<PanelDeSesion {...props} />);
    await userEvent.click(
      screen.getByRole("button", { name: /Abrir la votación: ¿Aprueba el orden del día\?/ }),
    );
    expect(a.abrir).toHaveBeenCalledWith("p1");
  });

  it("el formulario envía al pulsar Crear pregunta", async () => {
    const { props } = propiedades();
    const formulario = formularioFalso({ texto: "¿Aprueba?" });
    render(<PanelDeSesion {...props} formulario={formulario} />);
    await userEvent.click(screen.getByRole("button", { name: "Crear pregunta" }));
    expect(formulario.enviar).toHaveBeenCalled();
  });

  it("con opciones propias muestra los campos y el error", () => {
    const { props } = propiedades();
    render(
      <PanelDeSesion
        {...props}
        formulario={formularioFalso({ plantilla: false, error: "Escribe al menos dos opciones." })}
      />,
    );
    expect(screen.getByLabelText("Opción 1")).toBeTruthy();
    expect(screen.getByLabelText("Opción 2")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Agregar opción" })).toBeTruthy();
    expect(screen.getByText("Escribe al menos dos opciones.").getAttribute("role")).toBe("alert");
  });
});

describe("avisos", () => {
  it("la alerta de votos sobre códigos es un role=alert", () => {
    const { props } = propiedades({
      panel: {
        alerta: true,
        estado: salaVacia({ asistencia: 3, pregunta: { ...preguntaAbierta(), votosEmitidos: 4 } }),
      },
    });
    render(<PanelDeSesion {...props} />);
    const alertas = screen.getAllByRole("alert");
    expect(
      alertas.some((a) => a.textContent?.includes("Hay más votos que códigos activados")),
    ).toBe(true);
  });

  it("sin alerta no aparece", () => {
    render(<PanelDeSesion {...propiedades().props} />);
    expect(screen.queryByText(/Hay más votos que códigos/)).toBeNull();
  });

  it("CIERRE_OCUPADO muestra su mensaje y deja reintentar", async () => {
    const { props } = propiedades({
      panel: {
        error: { codigo: "CIERRE_OCUPADO", mensaje: "Hay votos entrando. Espera unos segundos." },
      },
    });
    render(<PanelDeSesion {...props} />);
    expect(screen.getByRole("alert").textContent).toContain("Hay votos entrando");
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(props.panel.reintentar).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Cerrar aviso" }));
    expect(props.panel.descartarError).toHaveBeenCalled();
  });

  it("otros errores no ofrecen reintentar", () => {
    const { props } = propiedades({
      panel: {
        error: { codigo: "OTRA_PREGUNTA_ABIERTA", mensaje: "Ya hay otra votación abierta." },
      },
    });
    render(<PanelDeSesion {...props} />);
    expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
  });

  it("sin conexión avisa", () => {
    render(<PanelDeSesion {...propiedades({ panel: { sinConexion: true } }).props} />);
    expect(screen.getByText(/Sin conexión con la sala/)).toBeTruthy();
  });
});

describe("sala y pestañas", () => {
  it("con códigos enlaza generar y entregar", () => {
    render(<PanelDeSesion {...propiedades().props} />);
    expect(screen.getByRole("link", { name: "Generar códigos" }).getAttribute("href")).toBe(
      "/mesa/sesiones/s1/codigos",
    );
    expect(screen.getByRole("link", { name: "Entregar códigos" }).getAttribute("href")).toBe(
      "/mesa/sesiones/s1/entregar",
    );
    expect(screen.getByText("1.284")).toBeTruthy();
  });

  it("sala abierta no tiene códigos", () => {
    const { props } = propiedades({
      sesion: { modo: "SALA_ABIERTA" },
      panel: { estado: salaVacia({ asistencia: null }) },
    });
    render(<PanelDeSesion {...props} />);
    expect(screen.queryByRole("link", { name: "Generar códigos" })).toBeNull();
    expect(screen.getByText(/no se cuenta/)).toBeTruthy();
  });

  it("las tres pestañas controlan su panel y avisan de lo pendiente", async () => {
    const { props } = propiedades({
      panel: {
        estado: conFila(),
        preguntas: [{ ...borrador, estado: "ABIERTA" }],
      },
    });
    render(<PanelDeSesion {...props} />);
    const pestanas = screen.getAllByRole("tab");
    expect(pestanas.map((p) => p.textContent)).toEqual(["Fila2", "Votación1", "Sala"]);
    const panel = (id: string) => document.getElementById(id) as HTMLElement;
    expect(panel("panel-fila").dataset["activa"]).toBe("true");
    expect(panel("panel-votacion").dataset["activa"]).toBe("false");
    await userEvent.click(screen.getByRole("tab", { name: /Votación/ }));
    expect(panel("panel-fila").dataset["activa"]).toBe("false");
    expect(panel("panel-votacion").dataset["activa"]).toBe("true");
    await userEvent.click(screen.getByRole("tab", { name: "Sala" }));
    expect(panel("panel-sala").dataset["activa"]).toBe("true");
  });
});

describe("accesibilidad", () => {
  const casos: Array<[string, () => PropiedadesDePanel]> = [
    ["sala vacía", () => propiedades().props],
    ["fila con mociones y orador", () => propiedades({ panel: { estado: conFila() } }).props],
    [
      "votación abierta con alerta",
      () =>
        propiedades({
          panel: {
            alerta: true,
            estado: salaVacia({
              asistencia: 3,
              pregunta: { ...preguntaAbierta(), votosEmitidos: 4 },
            }),
            preguntas: [{ ...borrador, estado: "ABIERTA" }],
          },
        }).props,
    ],
    [
      "resultado proyectado",
      () =>
        propiedades({
          panel: {
            estado: salaVacia({ pregunta: preguntaConResultado() }),
            preguntas: [
              { ...borrador, estado: "CERRADA", resultadoProyectado: true, resultado: RESULTADO },
            ],
          },
        }).props,
    ],
    [
      "error con reintento",
      () =>
        propiedades({
          panel: { error: { codigo: "CIERRE_OCUPADO", mensaje: "Hay votos entrando." } },
        }).props,
    ],
    ["sala abierta", () => propiedades({ sesion: { modo: "SALA_ABIERTA" } }).props],
  ];
  for (const tema of ["claro", "oscuro"] as const) {
    for (const [nombre, construir] of casos) {
      it(`${nombre} sin violaciones (${tema})`, async () => {
        document.documentElement.setAttribute("data-tema", tema);
        const { container } = render(<PanelDeSesion {...construir()} segundosRestantes={90} />);
        expect(await violacionesDeAxe(container)).toEqual([]);
      });
    }
    it(`formulario con opciones propias sin violaciones (${tema})`, async () => {
      document.documentElement.setAttribute("data-tema", tema);
      const { container } = render(
        <PanelDeSesion
          {...propiedades().props}
          formulario={formularioFalso({
            plantilla: false,
            error: "Escribe al menos dos opciones.",
          })}
        />,
      );
      expect(await violacionesDeAxe(container)).toEqual([]);
    });
    it(`hoja de confirmación sin violaciones (${tema})`, async () => {
      document.documentElement.setAttribute("data-tema", tema);
      const { baseElement } = render(<PanelDeSesion {...propiedades().props} />);
      await userEvent.click(screen.getByRole("button", { name: "Terminar sesión" }));
      await screen.findByRole("dialog");
      expect(await violacionesDeAxe(baseElement)).toEqual([]);
    });
  }
});

describe("áreas táctiles", () => {
  const css = readFileSync(
    join(import.meta.dirname, "../../src/vistas/mesa/mesa.module.css"),
    "utf8",
  );
  const alturaMinima = (selector: string): number => {
    const escapado = selector.replace(/[.\\[\]]/g, "\\$&");
    const regla = new RegExp(`${escapado}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? "";
    return Number(/min-height:\s*(\d+)px/.exec(regla)?.[1] ?? 0);
  };
  for (const selector of [".radio", ".volver", ".sesion"]) {
    it(`${selector} mide al menos 44 px de alto`, () => {
      expect(alturaMinima(selector)).toBeGreaterThanOrEqual(44);
    });
  }
});
