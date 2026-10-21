import { describe, expect, it, vi } from "vitest";
import { ejecutarCrearAdmin, type DependenciasDeCrearAdmin } from "../scripts/crear-admin";

function dependencias(stdin: string, crear = vi.fn(async () => undefined)) {
  const salida: string[] = [];
  const errores: string[] = [];
  const deps: DependenciasDeCrearAdmin = {
    leerStdin: async () => stdin,
    stdout: (texto) => salida.push(texto),
    stderr: (texto) => errores.push(texto),
    crearCuenta: crear,
  };
  return { deps, salida, errores, crear };
}

describe("crear-admin", () => {
  it("no imprime la contraseña que recibe por stdin", async () => {
    const { deps, salida, errores, crear } = dependencias("contrasena-secreta-123\n");
    const codigo = await ejecutarCrearAdmin(["--correo", "a@b.test", "--nombre", "Ana"], deps);
    expect(codigo).toBe(0);
    expect(crear).toHaveBeenCalledWith({
      correo: "a@b.test",
      nombre: "Ana",
      contrasena: "contrasena-secreta-123",
    });
    expect([...salida, ...errores].join("\n")).not.toContain("contrasena-secreta-123");
  });

  it("rechaza contraseñas de menos de 12 caracteres sin imprimirlas", async () => {
    const { deps, salida, errores, crear } = dependencias("corta123\n");
    expect(await ejecutarCrearAdmin(["--correo", "a@b.test", "--nombre", "Ana"], deps)).toBe(1);
    expect(crear).not.toHaveBeenCalled();
    expect([...salida, ...errores].join("\n")).not.toContain("corta123");
  });

  it("--generar imprime la contraseña una sola vez por stdout y la usa para crear la cuenta", async () => {
    const { deps, salida, errores, crear } = dependencias("");
    expect(
      await ejecutarCrearAdmin(["--correo", "a@b.test", "--nombre", "Ana", "--generar"], deps),
    ).toBe(0);
    expect(salida).toHaveLength(1);
    const generada = salida[0]?.trim() ?? "";
    expect(generada.length).toBeGreaterThanOrEqual(24);
    expect(crear).toHaveBeenCalledWith({ correo: "a@b.test", nombre: "Ana", contrasena: generada });
    expect(errores.join("\n")).not.toContain(generada);
  });

  it("exige correo y nombre", async () => {
    const { deps, crear } = dependencias("x".repeat(20));
    expect(await ejecutarCrearAdmin(["--nombre", "Ana"], deps)).toBe(2);
    expect(await ejecutarCrearAdmin(["--correo", "a@b.test"], deps)).toBe(2);
    expect(crear).not.toHaveBeenCalled();
  });

  it("si crear falla, no imprime la contraseña generada", async () => {
    const { deps, salida } = dependencias(
      "",
      vi.fn(async () => {
        throw new Error("ya existe");
      }),
    );
    expect(
      await ejecutarCrearAdmin(["--correo", "a@b.test", "--nombre", "Ana", "--generar"], deps),
    ).toBe(1);
    expect(salida).toHaveLength(0);
  });
});
