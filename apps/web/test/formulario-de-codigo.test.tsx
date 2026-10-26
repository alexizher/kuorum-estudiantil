// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { FormularioDeCodigo } from "@/portada/formulario-de-codigo";

afterEach(cleanup);

describe("FormularioDeCodigo", () => {
  it("normaliza a mayúsculas mientras se escribe", async () => {
    render(<FormularioDeCodigo irA={vi.fn()} />);
    const campo = screen.getByLabelText("Código de la sala") as HTMLInputElement;
    await userEvent.type(campo, "k7f2");
    expect(campo.value).toBe("K7F2");
  });

  it("rechaza caracteres fuera del alfabeto y lo explica", async () => {
    render(<FormularioDeCodigo irA={vi.fn()} />);
    const campo = screen.getByLabelText("Código de la sala") as HTMLInputElement;
    await userEvent.type(campo, "0o1l");
    expect(campo.value).toBe("");
    expect(screen.getByRole("alert").textContent).toContain("no hay 0, 1, I, L ni O");
  });

  it("con 4 caracteres válidos abre /s/{codigo}", async () => {
    const irA = vi.fn();
    render(<FormularioDeCodigo irA={irA} />);
    await userEvent.type(screen.getByLabelText("Código de la sala"), "k7f2");
    await userEvent.click(screen.getByRole("button", { name: "Entrar a la sala" }));
    expect(irA).toHaveBeenCalledWith("/s/K7F2");
  });

  it("incompleto no navega y avisa", async () => {
    const irA = vi.fn();
    render(<FormularioDeCodigo irA={irA} />);
    await userEvent.type(screen.getByLabelText("Código de la sala"), "k7");
    await userEvent.click(screen.getByRole("button", { name: "Entrar a la sala" }));
    expect(irA).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe("El código tiene 4 caracteres.");
  });

  it("Enter en el campo envía", async () => {
    const irA = vi.fn();
    render(<FormularioDeCodigo irA={irA} />);
    await userEvent.type(screen.getByLabelText("Código de la sala"), "abcd{Enter}");
    expect(irA).toHaveBeenCalledWith("/s/ABCD");
  });
});
