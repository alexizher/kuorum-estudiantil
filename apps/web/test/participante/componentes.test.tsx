// @vitest-environment jsdom
import { TemaProvider } from "@kuorum/ui";
import { cleanup, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Participante } from "@/vistas/participante/participante";
import type { PropiedadesDeParticipante } from "@/vistas/participante/participante";
import type { Turno } from "@/vistas/participante/use-palabra";
import { violacionesDeAxe } from "../proyeccion/axe";
import { preguntaAbierta, salaVacia } from "../proyeccion/estados";

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-tema");
});

function propiedades(
  cambios: {
    ingreso?: Partial<PropiedadesDeParticipante["ingreso"]>;
    sala?: Partial<PropiedadesDeParticipante["sala"]>;
    votacion?: Partial<PropiedadesDeParticipante["votacion"]>;
    palabra?: Partial<PropiedadesDeParticipante["palabra"]>;
  } = {},
): PropiedadesDeParticipante {
  return {
    codigo: "K7F2",
    ingreso: {
      fase: "dentro",
      error: undefined,
      enviando: false,
      enviarCodigo: vi.fn(async () => undefined),
      reintentar: vi.fn(async () => undefined),
      perderIngreso: vi.fn(),
      ...cambios.ingreso,
    },
    sala: { estado: salaVacia(), disponible: true, sinConexion: false, ...cambios.sala },
    votacion: {
      abierta: null,
      yaVoto: false,
      elegida: null,
      elegir: vi.fn(),
      votar: vi.fn(async () => undefined),
      enviando: false,
      error: undefined,
      ...cambios.votacion,
    },
    palabra: {
      nombre: "",
      nombreRecordado: false,
      escribirNombre: vi.fn(),
      turnos: [],
      enFila: false,
      tieneIntervencion: false,
      tieneMocion: false,
      pedirPalabra: vi.fn(async () => true),
      presentarMocion: vi.fn(async () => true),
      retirar: vi.fn(async () => true),
      ocupado: false,
      error: undefined,
      ...cambios.palabra,
    },
  };
}

function pintar(p: PropiedadesDeParticipante) {
  return render(
    <TemaProvider>
      <Participante {...p} />
    </TemaProvider>,
  );
}

const turno = (cambios: Partial<Turno> = {}): Turno => ({
  id: "s-1",
  tipo: "INTERVENCION",
  mocion: null,
  situacion: "en-fila",
  lugar: 3,
  total: 6,
  ...cambios,
});

const conVotacionAbierta = (extra: Partial<PropiedadesDeParticipante["votacion"]> = {}) =>
  propiedades({
    sala: { estado: salaVacia({ pregunta: preguntaAbierta() }) },
    votacion: { abierta: preguntaAbierta(), ...extra },
  });

async function irAPalabra() {
  await userEvent.click(screen.getByRole("tab", { name: /Palabra/ }));
}

describe("Participante: pantallas de entrada", () => {
  it("verificando el ingreso", () => {
    pintar(propiedades({ ingreso: { fase: "verificando" } }));
    expect(screen.getByRole("status").textContent).toContain("Entrando a la sala");
  });

  it("pide el código, lo envía y muestra el error", async () => {
    const p = propiedades({
      ingreso: { fase: "pide-codigo", error: "Ese código no es de esta sala." },
    });
    pintar(p);
    expect(screen.getByRole("alert").textContent).toBe("Ese código no es de esta sala.");
    await userEvent.type(screen.getByLabelText("Tu código de acceso"), "abcd-efgh");
    await userEvent.click(screen.getByRole("button", { name: "Entrar a la sala" }));
    expect(p.ingreso.enviarCodigo).toHaveBeenCalledWith("abcd-efgh");
  });

  it("mientras envía el código el botón queda desactivado", () => {
    pintar(propiedades({ ingreso: { fase: "pide-codigo", enviando: true } }));
    expect(
      (screen.getByRole("button", { name: "Entrando..." }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("sin conexión al entrar permite reintentar", async () => {
    const p = propiedades({ ingreso: { fase: "no-pudo", error: "No hay conexión." } });
    pintar(p);
    expect(screen.getByRole("alert").textContent).toBe("No hay conexión.");
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(p.ingreso.reintentar).toHaveBeenCalledOnce();
  });

  for (const caso of [
    {
      nombre: "ingreso no disponible",
      p: () => propiedades({ ingreso: { fase: "no-disponible" } }),
    },
    { nombre: "sala terminada", p: () => propiedades({ sala: { disponible: false } }) },
  ]) {
    it(`${caso.nombre}: mensaje y enlace a la portada`, () => {
      pintar(caso.p());
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
        "Esta sala no existe o ya terminó.",
      );
      expect(screen.getByRole("link", { name: "Ir a la portada" }).getAttribute("href")).toBe("/");
    });
  }

  it("aviso de sin conexión sin quitar la pantalla", () => {
    pintar(propiedades({ sala: { sinConexion: true } }));
    expect(screen.getByText("Sin conexión, reintentando")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Votar" })).toBeTruthy();
  });
});

describe("Participante: pestaña Votar", () => {
  it("cabecera con el título y el código de la sala", () => {
    pintar(propiedades());
    expect(screen.getByText("Asamblea General de Estudiantes")).toBeTruthy();
    expect(screen.getByText("K7F2")).toBeTruthy();
  });

  it("sin votación abierta lo dice", () => {
    pintar(propiedades());
    expect(screen.getByText("Todavía no hay una votación abierta.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Votar" })).toBeNull();
  });

  it("votación abierta: pregunta, voto secreto, opciones y botón Votar", async () => {
    const p = conVotacionAbierta();
    pintar(p);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("¿Aprueba la asamblea");
    expect(screen.getByText("Voto secreto")).toBeTruthy();
    const opciones = screen.getAllByRole("radio");
    expect(opciones.map((o) => o.closest("label")?.textContent)).toEqual([
      "Sí",
      "No",
      "Me abstengo",
    ]);
    expect(screen.getByText("Elige una opción para votar.")).toBeTruthy();
    await userEvent.click(screen.getByRole("radio", { name: "No" }));
    expect(p.votacion.elegir).toHaveBeenCalledWith("o1");
  });

  it("con una opción elegida cambia la ayuda y Votar envía", async () => {
    const p = conVotacionAbierta({ elegida: "o1" });
    pintar(p);
    expect((screen.getByRole("radio", { name: "No" }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText("Puedes cambiar la opción hasta que votes.")).toBeTruthy();
    const votar = screen.getByRole("button", { name: "Votar" });
    expect(votar.getAttribute("aria-disabled")).toBe("false");
    await userEvent.click(votar);
    expect(p.votacion.votar).toHaveBeenCalledOnce();
  });

  it("sin opción elegida Votar queda marcado como inactivo pero responde con el aviso", async () => {
    const p = conVotacionAbierta();
    pintar(p);
    const votar = screen.getByRole("button", { name: "Votar" });
    expect(votar.getAttribute("aria-disabled")).toBe("true");
    await userEvent.click(votar);
    expect(p.votacion.votar).toHaveBeenCalledOnce();
  });

  it("muestra el error del voto", () => {
    pintar(conVotacionAbierta({ error: "La votación ya se cerró." }));
    expect(screen.getByRole("alert").textContent).toBe("La votación ya se cerró.");
  });

  it("votación indicativa lo avisa", () => {
    const p = conVotacionAbierta();
    p.sala.estado = salaVacia({
      pregunta: preguntaAbierta(),
      sala: { ...salaVacia().sala, indicativa: true },
    });
    pintar(p);
    expect(screen.getByText("Votación indicativa")).toBeTruthy();
    expect(screen.getByText(/un voto por navegador/)).toBeTruthy();
  });

  it("después de votar: confirmación y sin formulario", () => {
    pintar(conVotacionAbierta({ yaVoto: true }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Tu voto quedó registrado");
    expect(screen.getByText("Nadie puede ver qué elegiste, ni la mesa.")).toBeTruthy();
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.queryByRole("button", { name: "Votar" })).toBeNull();
  });

  it("la pestaña Votar lleva aviso mientras hay voto pendiente", () => {
    pintar(conVotacionAbierta());
    const pestana = screen.getByRole("tab", { name: /Votar/ });
    expect(within(pestana).getByLabelText("Votación abierta")).toBeTruthy();
  });

  it("sin voto pendiente no hay aviso", () => {
    pintar(conVotacionAbierta({ yaVoto: true }));
    expect(
      within(screen.getByRole("tab", { name: /Votar/ })).queryByLabelText("Votación abierta"),
    ).toBeNull();
  });
});

describe("Participante: pestaña Palabra", () => {
  it("fuera de la fila pide el nombre y la palabra", async () => {
    const p = propiedades();
    pintar(p);
    await irAPalabra();
    const campo = screen.getByLabelText("Cómo quieres que te anuncien");
    await userEvent.type(campo, "A");
    expect(p.palabra.escribirNombre).toHaveBeenCalledWith("A");
    await userEvent.click(screen.getByRole("button", { name: "Pedir la palabra" }));
    expect(p.palabra.pedirPalabra).toHaveBeenCalledOnce();
  });

  it("sugiere un seudónimo a quien quiera anonimato total", async () => {
    pintar(propiedades());
    await irAPalabra();
    expect(screen.getByText(/Si quieres anonimato total, usa un seudónimo\./)).toBeTruthy();
  });

  it("con el nombre recordado no vuelve a preguntarlo y deja cambiarlo", async () => {
    pintar(propiedades({ palabra: { nombre: "Ana Gómez", nombreRecordado: true } }));
    await irAPalabra();
    expect(screen.queryByLabelText("Cómo quieres que te anuncien")).toBeNull();
    expect(screen.getByText(/Te anunciamos como/).textContent).toContain("Ana Gómez");
    await userEvent.click(screen.getByRole("button", { name: "Cambiar" }));
    expect((screen.getByLabelText("Cómo quieres que te anuncien") as HTMLInputElement).value).toBe(
      "Ana Gómez",
    );
  });

  it("muestra quién habla ahora", async () => {
    const base = salaVacia();
    pintar(
      propiedades({
        sala: {
          estado: {
            ...base,
            palabra: {
              conLaPalabra: {
                id: "x",
                nombre: "Valentina Ríos",
                tipo: "INTERVENCION",
                mocion: null,
                inicioEn: base.horaDelServidor,
                segundosTotales: 180,
              },
              fila: [],
            },
          },
        },
      }),
    );
    await irAPalabra();
    expect(screen.getByText("Ahora habla")).toBeTruthy();
    expect(screen.getByText("Valentina Ríos")).toBeTruthy();
  });

  it("en la fila: lugar, total y retirarse; no ofrece pedir otra vez", async () => {
    const p = propiedades({
      palabra: { turnos: [turno()], enFila: true, tieneIntervencion: true },
    });
    pintar(p);
    await irAPalabra();
    expect(screen.getByText("Vas en el lugar 3 de 6.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Pedir la palabra" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Retirarme de la fila" }));
    expect(p.palabra.retirar).toHaveBeenCalledWith("s-1");
  });

  it("la pestaña Palabra muestra el lugar", () => {
    pintar(propiedades({ palabra: { turnos: [turno()], enFila: true, tieneIntervencion: true } }));
    expect(
      within(screen.getByRole("tab", { name: /Palabra/ })).getByLabelText("Lugar en la fila")
        .textContent,
    ).toBe("3");
  });

  it("recién pedida, antes de salir en el estado", async () => {
    pintar(
      propiedades({
        palabra: {
          turnos: [turno({ situacion: "pendiente", lugar: null })],
          enFila: true,
          tieneIntervencion: true,
        },
      }),
    );
    await irAPalabra();
    expect(screen.getByRole("status").textContent).toContain("Anotándote en la fila");
  });

  it("con la palabra", async () => {
    pintar(
      propiedades({
        palabra: {
          turnos: [turno({ situacion: "con-la-palabra", lugar: null })],
          enFila: true,
          tieneIntervencion: true,
        },
      }),
    );
    await irAPalabra();
    expect(screen.getByText("Tienes la palabra")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Retirarme de la fila" })).toBeNull();
  });

  it("moción en la fila: nombre del tipo y retirar", async () => {
    const p = propiedades({
      palabra: {
        turnos: [turno({ id: "m1", tipo: "MOCION", mocion: "ORDEN", lugar: 1, total: 1 })],
        enFila: true,
        tieneMocion: true,
      },
    });
    pintar(p);
    await irAPalabra();
    expect(screen.getByText("Moción de orden")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Presentar una moción" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Retirar la moción" }));
    expect(p.palabra.retirar).toHaveBeenCalledWith("m1");
  });

  it("muestra el error de la palabra", async () => {
    pintar(propiedades({ palabra: { error: "Ya estás en la fila." } }));
    await irAPalabra();
    expect(screen.getByRole("alert").textContent).toBe("Ya estás en la fila.");
  });

  it("la hoja de mociones lista los cuatro tipos con su descripción", async () => {
    const p = propiedades({ palabra: { nombre: "Ana", nombreRecordado: true } });
    pintar(p);
    await irAPalabra();
    await userEvent.click(screen.getByRole("button", { name: "Presentar una moción" }));
    const hoja = screen.getByRole("dialog");
    expect(
      within(hoja)
        .getAllByRole("radio")
        .map((r) => r.closest("label")?.textContent),
    ).toEqual([
      "De ordenPide que se respete el reglamento o el orden del día.",
      "De procedimientoPropone otra forma de llevar la discusión o la votación.",
      "De aclaraciónPide que se explique un dato o qué se está votando.",
      "De suficiente ilustraciónPropone cerrar el debate y pasar a votar.",
    ]);
    const presentar = within(hoja).getByRole("button", { name: "Presentar moción" });
    expect(presentar.getAttribute("aria-disabled")).toBe("true");
    await userEvent.click(presentar);
    expect(p.palabra.presentarMocion).not.toHaveBeenCalled();
    await userEvent.click(within(hoja).getByRole("radio", { name: /De aclaración/ }));
    expect(presentar.getAttribute("aria-disabled")).toBe("false");
    await userEvent.click(presentar);
    expect(p.palabra.presentarMocion).toHaveBeenCalledWith("ACLARACION");
  });

  it("la hoja pide el nombre si no se conoce", async () => {
    const p = propiedades();
    pintar(p);
    await irAPalabra();
    await userEvent.click(screen.getByRole("button", { name: "Presentar una moción" }));
    const hoja = screen.getByRole("dialog");
    await userEvent.type(within(hoja).getByLabelText("Cómo quieres que te anuncien"), "B");
    expect(p.palabra.escribirNombre).toHaveBeenCalledWith("B");
  });
});

describe("Participante: accesibilidad", () => {
  const casos: [string, () => PropiedadesDeParticipante, boolean?][] = [
    ["verificando", () => propiedades({ ingreso: { fase: "verificando" } })],
    [
      "código",
      () =>
        propiedades({ ingreso: { fase: "pide-codigo", error: "Ese código no es de esta sala." } }),
    ],
    ["no pudo", () => propiedades({ ingreso: { fase: "no-pudo", error: "No hay conexión." } })],
    ["no disponible", () => propiedades({ sala: { disponible: false } })],
    ["sin votación", () => propiedades()],
    ["votación abierta", () => conVotacionAbierta()],
    [
      "opción elegida con error",
      () => conVotacionAbierta({ elegida: "o0", error: "La votación ya se cerró." }),
    ],
    ["voto confirmado", () => conVotacionAbierta({ yaVoto: true })],
    ["palabra fuera de la fila", () => propiedades(), true],
    [
      "palabra en la fila",
      () => propiedades({ palabra: { turnos: [turno()], enFila: true, tieneIntervencion: true } }),
      true,
    ],
  ];
  for (const tema of ["claro", "oscuro"] as const) {
    for (const [nombre, construir, enPalabra] of casos) {
      it(`${nombre} sin violaciones (${tema})`, async () => {
        document.documentElement.setAttribute("data-tema", tema);
        const { container } = pintar(construir());
        if (enPalabra) await irAPalabra();
        expect(await violacionesDeAxe(container)).toEqual([]);
      });
    }

    it(`hoja de mociones sin violaciones (${tema})`, async () => {
      document.documentElement.setAttribute("data-tema", tema);
      const { baseElement } = pintar(propiedades());
      await irAPalabra();
      await userEvent.click(screen.getByRole("button", { name: "Presentar una moción" }));
      expect(await violacionesDeAxe(baseElement)).toEqual([]);
    });
  }
});

describe("áreas táctiles", () => {
  const css = readFileSync(
    join(import.meta.dirname, "../../src/vistas/participante/participante.module.css"),
    "utf8",
  );
  const alturaMinima = (selector: string): number => {
    const escapado = selector.replace(/[.\\[\]]/g, "\\$&");
    const regla = new RegExp(`${escapado}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? "";
    return Number(/min-height:\s*(\d+)px/.exec(regla)?.[1] ?? 0);
  };

  for (const selector of [".opcion", ".tipo", ".pedir", ".secundaria", ".enlace"]) {
    it(`${selector} mide al menos 44 px de alto`, () => {
      expect(alturaMinima(selector)).toBeGreaterThanOrEqual(44);
    });
  }
});
