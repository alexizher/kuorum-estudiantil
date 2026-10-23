// @vitest-environment jsdom
import { TemaProvider } from "@kuorum/ui";
import { cleanup, render as renderizar, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import {
  Calendario,
  type PropiedadesDeCalendario,
  type SesionVisible,
} from "../../src/vistas/calendario/calendario";
import { violacionesDeAxe } from "../proyeccion/axe";

const render = (ui: ReactElement) => renderizar(ui, { wrapper: TemaProvider });
afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-tema");
});

const sesiones: PropiedadesDeCalendario["sesiones"] = [
  {
    id: "s1",
    titulo: "Asamblea de noche",
    cuerpo: { nombre: "Artes", slug: "artes" },
    inicio: new Date("2026-11-04T04:30:00Z"),
    fin: new Date("2026-11-04T06:00:00Z"),
    modalidad: "MIXTA",
    lugar: "Auditorio",
    estado: "PROGRAMADA",
    actaId: null,
  },
  {
    id: "s2",
    titulo: "Asamblea cancelada",
    cuerpo: { nombre: "Asamblea general", slug: "asamblea-general" },
    inicio: new Date("2026-11-10T15:00:00Z"),
    fin: new Date("2026-11-10T17:00:00Z"),
    modalidad: "PRESENCIAL",
    lugar: null,
    estado: "CANCELADA",
    actaId: null,
  },
];

const base: PropiedadesDeCalendario = {
  institucion: {
    nombre: "Universidad de Ejemplo",
    tipoDeCuerpoPlural: "Facultades",
    zonaHoraria: "America/Bogota",
  },
  cuerpos: [
    { nombre: "Asamblea general", slug: "asamblea-general", archivado: false },
    { nombre: "Artes", slug: "artes", archivado: false },
    { nombre: "Vieja", slug: "vieja", archivado: true },
  ],
  sesiones,
  vista: "mes",
  mes: "2026-11",
  cuerpoSlug: undefined,
  origen: "https://kuorum.example",
};

describe("Calendario", () => {
  it("en la vista de mes pone la sesión de las 23:30 en el día 3", () => {
    render(<Calendario {...base} />);
    const dia3 = screen.getByRole("cell", { name: "3 de noviembre" });
    expect(dia3.textContent).toContain("Asamblea de noche");
    expect(dia3.textContent).toContain("23:30");
    expect(screen.getByRole("cell", { name: "4 de noviembre" }).textContent).not.toContain(
      "Asamblea de noche",
    );
  });

  it("tacha la cancelada y lo dice", () => {
    render(<Calendario {...base} vista="lista" />);
    const cancelada = screen.getAllByText("Asamblea cancelada")[0];
    expect(cancelada?.closest("s")).not.toBeNull();
    expect(cancelada?.closest("li")?.textContent).toContain("Cancelada");
  });

  it("la lista agrupa por día con la hora, el cuerpo, la modalidad y el lugar", () => {
    render(<Calendario {...base} vista="lista" />);
    const lista = screen.getByRole("list", { name: "Sesiones" });
    const dia = within(lista).getByRole("heading", { name: /martes, 3 de noviembre/ });
    const item = dia.closest("section")?.textContent ?? "";
    expect(item).toContain("23:30 a 01:00");
    expect(item).toContain("Artes");
    expect(item).toContain("Mixta");
    expect(item).toContain("Auditorio");
  });

  it("filtra por cuerpo con enlaces que conservan la vista y el mes, sin los archivados", () => {
    render(<Calendario {...base} cuerpoSlug="artes" />);
    const filtro = screen.getByRole("navigation", { name: "Filtrar por cuerpo" });
    const enlaces = within(filtro).getAllByRole("link");
    expect(enlaces.map((e) => e.textContent)).toEqual(["Todos", "Asamblea general", "Artes"]);
    expect(enlaces[2]?.getAttribute("aria-current")).toBe("page");
    expect(enlaces[1]?.getAttribute("href")).toBe(
      "/calendario?vista=mes&mes=2026-11&cuerpo=asamblea-general",
    );
  });

  it("navega entre meses y ofrece la suscripción completa y la del cuerpo", () => {
    render(<Calendario {...base} cuerpoSlug="artes" />);
    expect(screen.getByRole("link", { name: "Mes anterior" }).getAttribute("href")).toBe(
      "/calendario?vista=mes&mes=2026-10&cuerpo=artes",
    );
    expect(screen.getByRole("link", { name: "Mes siguiente" }).getAttribute("href")).toBe(
      "/calendario?vista=mes&mes=2026-12&cuerpo=artes",
    );
    const suscripcion = screen.getByRole("region", { name: "Suscribirse" });
    expect(suscripcion.textContent).toContain(
      "https://kuorum.example/api/public/v1/calendario.ics",
    );
    expect(suscripcion.textContent).toContain(
      "https://kuorum.example/api/public/v1/calendario.ics?cuerpo=artes",
    );
  });

  it("las sesiones con acta final enlazan al PDF", () => {
    const conActa = { ...sesiones[0], estado: "ACTA_FINAL", actaId: "s1" } as SesionVisible;
    render(<Calendario {...base} vista="lista" sesiones={[conActa, ...sesiones.slice(1)]} />);
    const enlaces = screen.getAllByRole("link", { name: /^Acta/ });
    expect(enlaces).toHaveLength(1);
    expect(enlaces[0]?.getAttribute("href")).toBe("/api/public/v1/actas/s1.pdf");
  });

  it("sin sesiones lo dice", () => {
    render(<Calendario {...base} vista="lista" sesiones={[]} />);
    expect(screen.getByText("No hay sesiones programadas en este periodo.")).toBeTruthy();
  });

  for (const tema of ["claro", "oscuro"] as const) {
    for (const vista of ["mes", "lista"] as const) {
      it(`sin violaciones de accesibilidad (${vista}, ${tema})`, async () => {
        document.documentElement.setAttribute("data-tema", tema);
        const { baseElement } = render(<Calendario {...base} vista={vista} />);
        expect(await violacionesDeAxe(baseElement)).toEqual([]);
      });
    }
  }
});
