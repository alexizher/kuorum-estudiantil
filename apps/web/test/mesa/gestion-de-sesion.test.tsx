// @vitest-environment jsdom
import { TemaProvider } from "@kuorum/ui";
import { cleanup, fireEvent, render as renderizar, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { SesionEnVivo } from "../../src/vistas/mesa/sesion-en-vivo";
import { salaVacia } from "../proyeccion/estados";

const refrescar = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: refrescar }) }));

const render = (ui: ReactElement) => renderizar(ui, { wrapper: TemaProvider });

beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});
afterEach(() => {
  cleanup();
  refrescar.mockClear();
});

const programacion = {
  cuerpo: "Artes",
  inicioLocal: "2026-11-03T14:00",
  finLocal: "2026-11-03T16:00",
  modalidad: "PRESENCIAL" as const,
  lugar: "Auditorio",
  puedeGestionar: true,
};

function sesion(cambios: Partial<typeof programacion> = {}, estado = "PROGRAMADA") {
  return {
    id: "s1",
    titulo: "Asamblea de Artes",
    codigo: "K7F2",
    modo: "CON_CODIGOS" as const,
    estado,
    programacion: { ...programacion, ...cambios },
  };
}

/** La sala programada, como la ve el endpoint público antes de iniciarla. */
const salaProgramada = () => salaVacia({ sala: { ...salaVacia().sala, estado: "PROGRAMADA" } });

function fetchFalso(cruces: unknown[] = [], enVivo = salaProgramada()) {
  return vi.fn<typeof fetch>(async (url) => {
    const ruta = String(url);
    if (ruta.includes("/estado")) return Response.json(enVivo);
    if (ruta.endsWith("/preguntas")) return Response.json({ preguntas: [] });
    if (ruta.startsWith("/api/mesa/v1/cruces")) return Response.json({ cruces });
    return new Response(null, { status: 204 });
  });
}

const posts = (f: ReturnType<typeof fetchFalso>) =>
  f.mock.calls.filter((c) => c[1]?.method === "POST").map((c) => String(c[0]));

describe("gestión de una sesión programada", () => {
  it("la cabecera muestra cuerpo, fecha, horas, modalidad y lugar", async () => {
    render(<SesionEnVivo sesion={sesion()} dependencias={{ fetch: fetchFalso() }} />);
    const cabecera = await screen.findByRole("banner");
    expect(cabecera.textContent).toContain("Artes");
    expect(cabecera.textContent).toContain("3 nov 2026, 14:00 a 16:00");
    expect(cabecera.textContent).toContain("Presencial");
    expect(cabecera.textContent).toContain("Auditorio");
  });

  it("quien no la gestiona no ve reprogramar ni cancelar", async () => {
    render(
      <SesionEnVivo
        sesion={sesion({ puedeGestionar: false })}
        dependencias={{ fetch: fetchFalso() }}
      />,
    );
    await screen.findByRole("button", { name: "Iniciar sesión" });
    expect(screen.queryByRole("button", { name: "Reprogramar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancelar sesión" })).toBeNull();
  });

  it("en curso ya no se reprograma ni se cancela", async () => {
    render(
      <SesionEnVivo
        sesion={sesion({}, "EN_CURSO")}
        dependencias={{ fetch: fetchFalso([], salaVacia()) }}
      />,
    );
    await screen.findByRole("button", { name: "Terminar sesión" });
    expect(screen.queryByRole("button", { name: "Reprogramar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancelar sesión" })).toBeNull();
  });

  it("cancelar pide confirmación, llama a la API y recarga la página", async () => {
    const f = fetchFalso();
    render(<SesionEnVivo sesion={sesion()} dependencias={{ fetch: f }} />);
    await userEvent.click(await screen.findByRole("button", { name: "Cancelar sesión" }));
    expect(posts(f)).not.toContain("/api/mesa/v1/sesiones/s1/cancelar");
    await userEvent.click(await screen.findByRole("button", { name: "Sí, cancelarla" }));
    await waitFor(() => expect(posts(f)).toContain("/api/mesa/v1/sesiones/s1/cancelar"));
    await waitFor(() => expect(refrescar).toHaveBeenCalled());
  });

  it("reprogramar parte de lo actual, avisa de cruces sin contarse a sí misma y guarda", async () => {
    const cruce = {
      id: "s9",
      titulo: "Asamblea de Medicina",
      cuerpo: "Medicina",
      inicioLocal: "2026-11-03T15:00",
      finLocal: "2026-11-03T18:00",
    };
    const f = fetchFalso([cruce]);
    render(<SesionEnVivo sesion={sesion()} dependencias={{ fetch: f }} />);
    await userEvent.click(await screen.findByRole("button", { name: "Reprogramar" }));
    expect((screen.getByLabelText("Título") as HTMLInputElement).value).toBe("Asamblea de Artes");
    expect((screen.getByLabelText("Fecha") as HTMLInputElement).value).toBe("2026-11-03");
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "17:00" } });
    expect(await screen.findByText(/Se cruza con/)).toBeTruthy();
    expect(
      f.mock.calls.some(
        (c) => String(c[0]).includes("/cruces?") && String(c[0]).includes("excluir=s1"),
      ),
    ).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => {
      const llamada = f.mock.calls.find((c) => String(c[0]).endsWith("/reprogramar"));
      expect(JSON.parse(String(llamada?.[1]?.body))).toEqual({
        titulo: "Asamblea de Artes",
        inicio: "2026-11-03T14:00",
        fin: "2026-11-03T17:00",
        modalidad: "PRESENCIAL",
        lugar: "Auditorio",
      });
    });
    await waitFor(() => expect(refrescar).toHaveBeenCalled());
  });

  it("si la API rechaza el horario, muestra el mensaje y no recarga", async () => {
    const f = vi.fn<typeof fetch>(async (url) => {
      const ruta = String(url);
      if (ruta.includes("/estado")) return Response.json(salaProgramada());
      if (ruta.endsWith("/preguntas")) return Response.json({ preguntas: [] });
      if (ruta.endsWith("/reprogramar")) {
        return Response.json(
          {
            error: "HORARIO_INVALIDO",
            mensaje: "La hora de fin tiene que ser después del inicio.",
          },
          { status: 422 },
        );
      }
      return Response.json({ cruces: [] });
    });
    render(<SesionEnVivo sesion={sesion()} dependencias={{ fetch: f }} />);
    await userEvent.click(await screen.findByRole("button", { name: "Reprogramar" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect((await screen.findByText(/después del inicio/)).getAttribute("role")).toBe("alert");
    expect(refrescar).not.toHaveBeenCalled();
  });
});
