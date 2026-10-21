import { existsSync, statSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { AdminStep, redact, type SignalEmitter } from "../../src/steps/admin-step.js";
import { FakePrompter, FakeRunner, makeContext } from "../doubles.js";

const CONFIG = {
  institutionName: "Universidad del Ejemplo",
  shortName: "ejemplo",
  adminEmail: "mesa@ejemplo.test",
  adminName: "Mesa Directiva",
};
const CLAVE = "Zx9-generada-solo-una-vez";

function runnerFeliz() {
  return new FakeRunner((command) => (command === "pnpm" ? { stdout: `${CLAVE}\n` } : undefined));
}

describe("administrador", () => {
  it("pide el env a un archivo temporal 0600, corre crear-admin con ese env y lo borra", async () => {
    let ruta = "";
    let modo = 0;
    let existiaAlCrear = false;
    const runner = new FakeRunner((command, args) => {
      if (command === "vercel") ruta = args[2] ?? "";
      if (command === "pnpm") {
        existiaAlCrear = existsSync(ruta);
        modo = statSync(ruta).mode & 0o777;
        return { stdout: `${CLAVE}\n` };
      }
      return undefined;
    });
    // El doble de vercel no escribe el archivo: lo rellenamos cuando el paso lo pide.
    const correr = runner.run.bind(runner);
    runner.run = async (command, args, options) => {
      const resultado = await correr(command, args, options);
      if (command === "vercel") {
        await writeFile(
          args[2] as string,
          'DATABASE_URL="postgres://u:p@h/db"\nBETTER_AUTH_SECRET="abc"\n# comentario\n',
        );
      }
      return resultado;
    };
    await new AdminStep().run(makeContext({ runner, config: CONFIG }));

    const pull = runner.lines.find((l) => l.startsWith("vercel env pull"));
    expect(pull).toContain("--environment production");
    expect(pull).toContain("--yes");
    expect(existiaAlCrear).toBe(true);
    expect(modo).toBe(0o600);
    expect(existsSync(ruta)).toBe(false);

    const crear = runner.calls.find((c) => c.command === "pnpm");
    expect(crear?.args).toEqual([
      "--filter",
      "@kuorum/web",
      "exec",
      "tsx",
      "scripts/crear-admin.ts",
      "--correo",
      "mesa@ejemplo.test",
      "--nombre",
      "Mesa Directiva",
      "--generar",
    ]);
    expect(crear?.options?.env).toMatchObject({
      DATABASE_URL: "postgres://u:p@h/db",
      BETTER_AUTH_SECRET: "abc",
    });
  });

  it("muestra la contraseña generada una sola vez y no la guarda en el estado", async () => {
    const prompter = new FakePrompter();
    const state = { completedSteps: [] as string[] };
    await new AdminStep().run(
      makeContext({ runner: runnerFeliz(), prompter, config: CONFIG, state }),
    );
    const mensajes = [...prompter.infos, ...prompter.successes, ...prompter.failures];
    expect(mensajes.filter((m) => m.includes(CLAVE))).toHaveLength(1);
    expect(JSON.stringify(state)).not.toContain(CLAVE);
  });

  it("borra el archivo temporal aunque crear-admin falle", async () => {
    let ruta = "";
    const runner = new FakeRunner((command, args) => {
      if (command === "vercel") ruta = args[2] ?? "";
      if (command === "pnpm") return { exitCode: 1, stderr: "se cayó la base" };
      return undefined;
    });
    const prompter = new FakePrompter();
    await expect(
      new AdminStep().run(makeContext({ runner, prompter, config: CONFIG })),
    ).rejects.toThrow(/se cayó la base/);
    expect(ruta).not.toBe("");
    expect(existsSync(ruta)).toBe(false);
  });

  it("borra el archivo temporal aunque vercel env pull falle", async () => {
    let ruta = "";
    const runner = new FakeRunner((command, args) => {
      if (command === "vercel") {
        ruta = args[2] ?? "";
        return { exitCode: 1, stderr: "sin sesión" };
      }
      return undefined;
    });
    await expect(new AdminStep().run(makeContext({ runner, config: CONFIG }))).rejects.toThrow(
      /sin sesión/,
    );
    expect(existsSync(ruta)).toBe(false);
    expect(runner.calls.some((c) => c.command === "pnpm")).toBe(false);
  });

  it("si la cuenta ya existe, lo dice y no falla", async () => {
    const runner = new FakeRunner((command) =>
      command === "pnpm"
        ? { exitCode: 1, stderr: "Ya existe una cuenta con el correo x" }
        : undefined,
    );
    const prompter = new FakePrompter();
    await new AdminStep().run(makeContext({ runner, prompter, config: CONFIG }));
    expect(prompter.infos.join(" ")).toMatch(/ya existe/i);
  });

  it("pregunta correo y nombre en modo interactivo si la configuración no los trae", async () => {
    const runner = runnerFeliz();
    const prompter = new FakePrompter(["otra@ejemplo.test", "Otra Persona"]);
    await new AdminStep().run(makeContext({ runner, prompter }));
    const crear = runner.calls.find((c) => c.command === "pnpm");
    expect(crear?.args).toContain("otra@ejemplo.test");
    expect(crear?.args).toContain("Otra Persona");
  });

  it("sin datos y sin interacción, se omite con un mensaje y no toca nada", async () => {
    const runner = new FakeRunner();
    const prompter = new FakePrompter();
    const resultado = await new AdminStep().run(
      makeContext({ runner, prompter, interactive: false }),
    );
    expect(resultado).toBe("omitido");
    expect(runner.calls).toEqual([]);
    expect(prompter.infos.join(" ")).toMatch(/adminEmail/);
  });

  it("no deja URLs de Postgres ni secretos en el error de crear-admin", async () => {
    const runner = new FakeRunner((command, args) => {
      if (command === "pnpm") {
        return {
          exitCode: 1,
          stderr: "connect fallo postgresql://u:clave@h/db y el secreto abc12345\nsegunda línea",
        };
      }
      return args[0] === "env" ? undefined : undefined;
    });
    const original = runner.run.bind(runner);
    runner.run = async (command, args, options) => {
      const r = await original(command, args, options);
      if (command === "vercel") {
        await writeFile(args[2] as string, 'BETTER_AUTH_SECRET="abc12345"\n');
      }
      return r;
    };
    const error = await new AdminStep()
      .run(makeContext({ runner, config: CONFIG }))
      .catch((e: Error) => e);
    const mensaje = (error as Error).message;
    expect(mensaje).not.toContain("clave");
    expect(mensaje).not.toContain("abc12345");
    expect(mensaje).not.toContain("segunda");
  });

  it("redact oculta URLs y valores secretos", () => {
    expect(redact("x postgres://a:b@c/d y", {})).toBe("x [URL oculta] y");
    expect(redact("token KUORUM1234", { KUORUM_SECRETO: "KUORUM1234", OTRA: "token" })).toBe(
      "token [oculto]",
    );
  });

  it("al recibir SIGINT borra el archivo temporal y sale", async () => {
    const oyentes = new Map<string, () => void>();
    const senales: SignalEmitter = {
      on: (senal, f) => oyentes.set(senal, f),
      off: (senal) => oyentes.delete(senal),
    };
    let ruta = "";
    let salida: number | undefined;
    const runner = new FakeRunner((command, args) => {
      if (command === "vercel") ruta = args[2] ?? "";
      if (command === "pnpm") {
        expect(existsSync(ruta)).toBe(true);
        oyentes.get("SIGINT")?.();
        return { stdout: `${CLAVE}\n` };
      }
      return undefined;
    });
    await new AdminStep(senales, (c) => (salida = c)).run(makeContext({ runner, config: CONFIG }));
    expect(salida).toBe(130);
    expect(existsSync(ruta)).toBe(false);
    expect(oyentes.size).toBe(0);
  });
});
