// @vitest-environment jsdom
import { TemaProvider } from "@kuorum/ui";
import { cleanup, render as renderizar, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PaginaDeVerificacion from "../../src/app/actas/verificar/page";
import { contenedor } from "../../src/composicion";
import { VerificacionDeActa } from "../../src/vistas/actas/verificacion-de-acta";
import { violacionesDeAxe } from "../proyeccion/axe";

vi.mock("../../src/composicion", () => ({ contenedor: vi.fn() }));

const render = (ui: ReactElement) => renderizar(ui, { wrapper: TemaProvider });
afterEach(() => cleanup());

const verificar = vi.fn();
beforeEach(() => {
  verificar.mockReset();
  vi.mocked(contenedor).mockReturnValue({
    verificarActa: { ejecutar: verificar },
  } as unknown as ReturnType<typeof contenedor>);
});

const resumen = {
  sesionId: "s1",
  codigo: "ABCDE-FGHJK",
  finalizadaEn: new Date("2026-11-04T03:30:00Z"),
  institucion: "Universidad",
  cuerpo: "Artes",
  titulo: "Asamblea de Artes",
  inicio: "2026-11-03T19:00:00.000Z",
  zonaHoraria: "America/Bogota",
};

describe("página /actas/verificar", () => {
  it("sin código solo muestra el formulario GET", async () => {
    render(await PaginaDeVerificacion({ searchParams: Promise.resolve({}) }));
    const campo = screen.getByLabelText("Código de verificación");
    expect(campo.closest("form")?.getAttribute("method")?.toLowerCase()).toBe("get");
    expect(verificar).not.toHaveBeenCalled();
  });

  it("un acta válida muestra cuerpo, título, fechas en la zona y el PDF", async () => {
    verificar.mockResolvedValue(resumen);
    render(
      await PaginaDeVerificacion({ searchParams: Promise.resolve({ codigo: "abcde fghjk" }) }),
    );
    expect(verificar).toHaveBeenCalledWith("abcde fghjk");
    expect(screen.getByText("Artes")).toBeTruthy();
    expect(screen.getByText("Asamblea de Artes")).toBeTruthy();
    expect(screen.getByText("3 de noviembre de 2026, 14:00")).toBeTruthy();
    expect(screen.getByText("3 de noviembre de 2026, 22:30")).toBeTruthy();
    expect(screen.getByRole("link", { name: /PDF/ }).getAttribute("href")).toBe(
      "/api/public/v1/actas/s1.pdf",
    );
  });

  it("un código que no existe o no es válido lo dice sin error", async () => {
    verificar.mockResolvedValue(null);
    render(await PaginaDeVerificacion({ searchParams: Promise.resolve({ codigo: "zzz" }) }));
    expect(screen.getByText("No encontramos un acta con ese código")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /PDF/ })).toBeNull();
  });
});

describe("accesibilidad", () => {
  it("sin violaciones (formulario, acta y no encontrada)", async () => {
    for (const estado of [undefined, resumen, null] as const) {
      const { baseElement, unmount } = render(
        <VerificacionDeActa
          codigo={estado === undefined ? undefined : "x"}
          acta={estado ?? null}
        />,
      );
      expect(await violacionesDeAxe(baseElement)).toEqual([]);
      unmount();
    }
  });
});
