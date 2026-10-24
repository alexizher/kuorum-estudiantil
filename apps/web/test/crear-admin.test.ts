import { describe, expect, it, vi } from "vitest";
import { ejecutarCrearAdmin, type DependenciasDeCrearAdmin } from "../scripts/crear-admin";

function dependencias(
  stdin: string,
  crear = vi.fn(async () => undefined),
  actualizar = vi.fn(async () => undefined),
) {
  const salida: string[] = [];
  const errores: string[] = [];
  const deps: DependenciasDeCrearAdmin = {
    leerStdin: async () => stdin,
    stdout: (texto) => salida.push(texto),
    stderr: (texto) => errores.push(texto),
    crearCuenta: crear,
    actualizarCuenta: actualizar,
  };
  return { deps, salida, errores, crear, actualizar };
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
      rol: "SUPERADMIN",
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
    expect(crear).toHaveBeenCalledWith({
      correo: "a@b.test",
      nombre: "Ana",
      contrasena: generada,
      rol: "SUPERADMIN",
    });
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

  it.each(["SUPERADMIN", "MESA", "DEMO"])("--rol %s crea la cuenta con ese rol", async (rol) => {
    const { deps, crear } = dependencias("contrasena-secreta-123\n");
    expect(
      await ejecutarCrearAdmin(["--correo", "a@b.test", "--nombre", "Ana", "--rol", rol], deps),
    ).toBe(0);
    expect(crear).toHaveBeenCalledWith(expect.objectContaining({ rol }));
  });

  it("sin --rol la cuenta es SUPERADMIN, como antes del asistente", async () => {
    const { deps, crear } = dependencias("contrasena-secreta-123\n");
    await ejecutarCrearAdmin(["--correo", "a@b.test", "--nombre", "Ana"], deps);
    expect(crear).toHaveBeenCalledWith(expect.objectContaining({ rol: "SUPERADMIN" }));
  });

  it("rechaza un rol desconocido sin crear nada", async () => {
    const { deps, crear, errores } = dependencias("contrasena-secreta-123\n");
    expect(
      await ejecutarCrearAdmin(["--correo", "a@b.test", "--nombre", "Ana", "--rol", "ROOT"], deps),
    ).toBe(2);
    expect(crear).not.toHaveBeenCalled();
    expect(errores.join("")).toContain("SUPERADMIN|MESA|DEMO");
  });

  it("para DEMO la contraseña también sale de stdin y no se imprime", async () => {
    const { deps, salida, errores, crear } = dependencias("contrasena-de-demo-1234\n");
    expect(
      await ejecutarCrearAdmin(
        ["--correo", "demo@b.test", "--nombre", "Cuenta de prueba", "--rol", "DEMO"],
        deps,
      ),
    ).toBe(0);
    expect(crear).toHaveBeenCalledWith({
      correo: "demo@b.test",
      nombre: "Cuenta de prueba",
      contrasena: "contrasena-de-demo-1234",
      rol: "DEMO",
    });
    expect([...salida, ...errores].join("\n")).not.toContain("contrasena-de-demo-1234");
  });

  describe("en una terminal", () => {
    function conTerminal(respuestas: string[]) {
      const base = dependencias("no-debe-leerse-de-stdin-123\n");
      const leerStdin = vi.fn(base.deps.leerStdin);
      const preguntas: string[] = [];
      const pedirSinEco = vi.fn(async (pregunta: string) => {
        preguntas.push(pregunta);
        return respuestas.shift() ?? "";
      });
      return {
        ...base,
        leerStdin,
        preguntas,
        pedirSinEco,
        deps: { ...base.deps, leerStdin, terminal: { pedirSinEco } },
      };
    }

    it("pide la contraseña dos veces sin eco y crea la cuenta si coinciden", async () => {
      const t = conTerminal(["contrasena-de-terminal-1", "contrasena-de-terminal-1"]);
      expect(await ejecutarCrearAdmin(["--correo", "a@b.test", "--nombre", "Ana"], t.deps)).toBe(0);
      expect(t.pedirSinEco).toHaveBeenCalledTimes(2);
      expect(t.leerStdin).not.toHaveBeenCalled();
      expect(t.crear).toHaveBeenCalledWith(
        expect.objectContaining({ contrasena: "contrasena-de-terminal-1" }),
      );
      expect([...t.salida, ...t.errores].join("\n")).not.toContain("contrasena-de-terminal-1");
    });

    it("si las dos no coinciden, falla sin crear nada ni imprimirlas", async () => {
      const t = conTerminal(["contrasena-de-terminal-1", "contrasena-de-terminal-2"]);
      expect(await ejecutarCrearAdmin(["--correo", "a@b.test", "--nombre", "Ana"], t.deps)).toBe(1);
      expect(t.crear).not.toHaveBeenCalled();
      const todo = [...t.salida, ...t.errores].join("\n");
      expect(todo).toContain("no coinciden");
      expect(todo).not.toContain("contrasena-de-terminal");
    });

    it("con --generar no pregunta nada", async () => {
      const t = conTerminal([]);
      expect(
        await ejecutarCrearAdmin(["--correo", "a@b.test", "--nombre", "Ana", "--generar"], t.deps),
      ).toBe(0);
      expect(t.pedirSinEco).not.toHaveBeenCalled();
    });

    it("también aplica el largo mínimo a lo que se escribe en la terminal", async () => {
      const t = conTerminal(["corta", "corta"]);
      expect(await ejecutarCrearAdmin(["--correo", "a@b.test", "--nombre", "Ana"], t.deps)).toBe(1);
      expect(t.crear).not.toHaveBeenCalled();
    });
  });

  describe("--actualizar", () => {
    it("cambia la contraseña y el rol de una cuenta que ya existe, sin crear otra", async () => {
      const { deps, crear, actualizar, salida, errores } = dependencias("nueva-contrasena-1234\n");
      expect(
        await ejecutarCrearAdmin(
          [
            "--correo",
            "demo@b.test",
            "--nombre",
            "Cuenta de prueba",
            "--rol",
            "DEMO",
            "--actualizar",
          ],
          deps,
        ),
      ).toBe(0);
      expect(crear).not.toHaveBeenCalled();
      expect(actualizar).toHaveBeenCalledWith({
        correo: "demo@b.test",
        nombre: "Cuenta de prueba",
        contrasena: "nueva-contrasena-1234",
        rol: "DEMO",
      });
      expect([...salida, ...errores].join("\n")).not.toContain("nueva-contrasena-1234");
    });

    it("con --generar imprime la contraseña nueva una sola vez", async () => {
      const { deps, actualizar, salida } = dependencias("");
      await ejecutarCrearAdmin(
        ["--correo", "demo@b.test", "--nombre", "X", "--rol", "DEMO", "--actualizar", "--generar"],
        deps,
      );
      expect(salida).toHaveLength(1);
      expect(actualizar).toHaveBeenCalledWith(
        expect.objectContaining({ contrasena: salida[0]?.trim() }),
      );
    });

    it("si la cuenta no existe falla sin imprimir la contraseña generada", async () => {
      const { deps, salida } = dependencias(
        "",
        undefined,
        vi.fn(async () => {
          throw new Error("No existe una cuenta con el correo demo@b.test.");
        }),
      );
      expect(
        await ejecutarCrearAdmin(
          ["--correo", "demo@b.test", "--nombre", "X", "--actualizar", "--generar"],
          deps,
        ),
      ).toBe(1);
      expect(salida).toHaveLength(0);
    });
  });
});
