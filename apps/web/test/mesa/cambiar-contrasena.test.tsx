// @vitest-environment jsdom
import { TemaProvider } from "@kuorum/ui";
import { cleanup, render as renderizar, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CambiarContrasena } from "../../src/vistas/mesa/cambiar-contrasena";

const render = (ui: ReactElement) => renderizar(ui, { wrapper: TemaProvider });
afterEach(cleanup);

async function llenar(actual: string, nueva: string, repetida: string) {
  await userEvent.type(screen.getByLabelText("Contraseña actual"), actual);
  await userEvent.type(screen.getByLabelText("Contraseña nueva"), nueva);
  await userEvent.type(screen.getByLabelText("Repite la contraseña nueva"), repetida);
  await userEvent.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
}

describe("CambiarContrasena", () => {
  it("con menos de 12 caracteres avisa sin llamar", async () => {
    const cambiar = vi.fn(async () => ({}));
    render(<CambiarContrasena cambiar={cambiar} />);
    await llenar("vieja-clave-123", "corta-11ch", "corta-11ch");
    expect((await screen.findByRole("alert")).textContent).toMatch(/al menos 12/);
    expect(cambiar).not.toHaveBeenCalled();
  });

  it("si no coinciden avisa sin llamar", async () => {
    const cambiar = vi.fn(async () => ({}));
    render(<CambiarContrasena cambiar={cambiar} />);
    await llenar("vieja-clave-123", "nueva-clave-123", "nueva-clave-124");
    expect((await screen.findByRole("alert")).textContent).toMatch(/no coinciden/);
    expect(cambiar).not.toHaveBeenCalled();
  });

  it("cambia, confirma y limpia el formulario", async () => {
    const cambiar = vi.fn(async () => ({}));
    render(<CambiarContrasena cambiar={cambiar} />);
    await llenar("vieja-clave-123", "nueva-clave-123", "nueva-clave-123");
    expect(cambiar).toHaveBeenCalledWith({ actual: "vieja-clave-123", nueva: "nueva-clave-123" });
    expect(await screen.findByText(/Contraseña cambiada/)).toBeTruthy();
    expect((screen.getByLabelText("Contraseña nueva") as HTMLInputElement).value).toBe("");
  });

  it("si la actual es incorrecta, lo dice", async () => {
    const cambiar = vi.fn(async () => ({ error: "La contraseña actual no es correcta." }));
    render(<CambiarContrasena cambiar={cambiar} />);
    await llenar("mala-clave-1234", "nueva-clave-123", "nueva-clave-123");
    expect((await screen.findByRole("alert")).textContent).toBe(
      "La contraseña actual no es correcta.",
    );
  });
});
