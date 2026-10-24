// @vitest-environment jsdom
import { TemaProvider } from "@kuorum/ui";
import { cleanup, fireEvent, render as renderizar, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FormularioDeSesion } from "@/vistas/mesa/formulario-de-sesion";
import type { DatosDelFormulario } from "@/vistas/mesa/use-sesiones";
import { puntosDeTexto } from "@/vistas/mesa/orden-del-dia";
import { INSTITUCION, clienteDeMesaFalso } from "./falsos";

const render = (ui: ReactElement) => renderizar(ui, { wrapper: TemaProvider });
afterEach(cleanup);

describe("puntosDeTexto", () => {
  it("separa por líneas, recorta y descarta las vacías", () => {
    expect(puntosDeTexto("  Quórum \n\n Informe\r\n   \nProposiciones")).toEqual([
      "Quórum",
      "Informe",
      "Proposiciones",
    ]);
    expect(puntosDeTexto("")).toEqual([]);
  });
});

describe("orden del día al programar", () => {
  it("envía los puntos como arreglo", async () => {
    const crear = vi.fn<(datos: DatosDelFormulario) => Promise<boolean>>(async () => true);
    render(
      <FormularioDeSesion
        crear={crear}
        creando={false}
        error={undefined}
        cuerpos={INSTITUCION.cuerpos}
        cliente={clienteDeMesaFalso()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Orden del día (un punto por línea)"), {
      target: { value: "Quórum\n\n Informe " },
    });
    await userEvent.click(screen.getByRole("button", { name: "Crear sesión" }));
    await waitFor(() => expect(crear).toHaveBeenCalled());
    expect(crear.mock.calls[0]?.[0]).toMatchObject({ ordenDelDia: ["Quórum", "Informe"] });
  });
});
