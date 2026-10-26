// @vitest-environment jsdom
import { TemaProvider } from "@kuorum/ui";
import { cleanup, render as renderizar, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import PaginaDeIngreso from "@/app/mesa/ingresar/page";
import { cuentaDePruebaDesdeEntorno } from "@/auth/cuenta-de-prueba";
import { FormularioDeIngreso } from "@/auth/formulario-de-ingreso";
import { violacionesDeAxe } from "./proyeccion/axe";

const render = (ui: ReactElement) => renderizar(ui, { wrapper: TemaProvider });

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

const CUENTA = { correo: "prueba@kuorum.test", contrasena: "una-contrasena-publica-1" };

describe("cuentaDePruebaDesdeEntorno", () => {
  const entorno = {
    KUORUM_MODO_DEMO: "1",
    KUORUM_DEMO_CORREO: CUENTA.correo,
    KUORUM_DEMO_CONTRASENA: CUENTA.contrasena,
  };

  it("con la bandera en 1 y los dos datos devuelve la cuenta", () => {
    expect(cuentaDePruebaDesdeEntorno(entorno)).toEqual(CUENTA);
  });

  it.each([undefined, "", "0", "true", "si"])("con la bandera en %s no devuelve nada", (valor) => {
    expect(cuentaDePruebaDesdeEntorno({ ...entorno, KUORUM_MODO_DEMO: valor })).toBeUndefined();
  });

  it("sin correo o sin contraseña no devuelve nada", () => {
    expect(cuentaDePruebaDesdeEntorno({ ...entorno, KUORUM_DEMO_CORREO: "" })).toBeUndefined();
    expect(
      cuentaDePruebaDesdeEntorno({ ...entorno, KUORUM_DEMO_CONTRASENA: undefined }),
    ).toBeUndefined();
  });
});

describe("FormularioDeIngreso", () => {
  it("sin cuenta de prueba no muestra el bloque", () => {
    render(<FormularioDeIngreso />);
    expect(screen.queryByText("Cuenta de prueba")).toBeNull();
    expect(screen.queryByRole("button", { name: "Usar la cuenta de prueba" })).toBeNull();
  });

  it("con cuenta de prueba muestra el bloque separado con correo, contraseña y la nota", () => {
    render(<FormularioDeIngreso cuentaDePrueba={CUENTA} />);
    const bloque = screen.getByRole("region", { name: "Cuenta de prueba" });
    expect(bloque.textContent).toContain(CUENTA.correo);
    expect(bloque.textContent).toContain(CUENTA.contrasena);
    expect(bloque.textContent).toContain(
      "Es pública: cualquiera puede verla. Sus sesiones se borran cada día.",
    );
    expect(screen.getByRole("button", { name: "Usar la cuenta de prueba" })).toBeTruthy();
  });

  it("el botón llena el formulario con la cuenta de prueba", async () => {
    render(<FormularioDeIngreso cuentaDePrueba={CUENTA} />);
    const correo = screen.getByLabelText("Correo") as HTMLInputElement;
    const contrasena = screen.getByLabelText("Contraseña") as HTMLInputElement;
    await userEvent.type(correo, "otra@persona.test");

    await userEvent.click(screen.getByRole("button", { name: "Usar la cuenta de prueba" }));

    expect(correo.value).toBe(CUENTA.correo);
    expect(contrasena.value).toBe(CUENTA.contrasena);
  });

  it("el formulario sigue siendo editable después de llenarlo", async () => {
    render(<FormularioDeIngreso cuentaDePrueba={CUENTA} />);
    await userEvent.click(screen.getByRole("button", { name: "Usar la cuenta de prueba" }));
    const correo = screen.getByLabelText("Correo") as HTMLInputElement;
    await userEvent.clear(correo);
    await userEvent.type(correo, "yo@correo.test");
    expect(correo.value).toBe("yo@correo.test");
  });
});

describe("PaginaDeIngreso", () => {
  it("sin la bandera no muestra nada de la cuenta de prueba", async () => {
    vi.stubEnv("KUORUM_MODO_DEMO", "");
    vi.stubEnv("KUORUM_DEMO_CORREO", CUENTA.correo);
    vi.stubEnv("KUORUM_DEMO_CONTRASENA", CUENTA.contrasena);
    const { container } = render(await PaginaDeIngreso());
    expect(container.textContent).not.toContain("Cuenta de prueba");
    expect(container.textContent).not.toContain(CUENTA.contrasena);
  });

  it("con KUORUM_MODO_DEMO=1 lee el entorno en el servidor y lo muestra", async () => {
    vi.stubEnv("KUORUM_MODO_DEMO", "1");
    vi.stubEnv("KUORUM_DEMO_CORREO", CUENTA.correo);
    vi.stubEnv("KUORUM_DEMO_CONTRASENA", CUENTA.contrasena);
    render(await PaginaDeIngreso());
    expect(screen.getByRole("region", { name: "Cuenta de prueba" }).textContent).toContain(
      CUENTA.correo,
    );
  });

  it("sin violaciones de accesibilidad con el bloque", async () => {
    vi.stubEnv("KUORUM_MODO_DEMO", "1");
    vi.stubEnv("KUORUM_DEMO_CORREO", CUENTA.correo);
    vi.stubEnv("KUORUM_DEMO_CONTRASENA", CUENTA.contrasena);
    const { baseElement } = render(await PaginaDeIngreso());
    expect(await violacionesDeAxe(baseElement)).toEqual([]);
  });
});
