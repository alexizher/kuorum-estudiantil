import { describe, expect, it } from "vitest";
import { DatabaseStep } from "../../src/steps/database-step.js";
import { FakePrompter, FakeRunner, makeContext } from "../doubles.js";

const ENV_OK =
  "DATABASE_URL  Encrypted  Production\nDATABASE_URL_UNPOOLED  Encrypted  Production\n";

/** `env ls` solo muestra las variables después de que `integration add` corrió. */
function afterAdd(envOutput: string, addResult: { exitCode?: number; stderr?: string } = {}) {
  let added = false;
  return new FakeRunner((_, args) => {
    if (args[1] === "add") {
      added = true;
      return addResult;
    }
    if (args[0] === "env") return { stdout: added ? envOutput : "" };
    return undefined;
  });
}

describe("base-de-datos", () => {
  it("la descripción nombra el recurso de Neon que va a crear", () => {
    const description = new DatabaseStep().description;
    const texto =
      typeof description === "function" ? description(makeContext().config) : description;
    expect(texto).toContain('"ejemplo-db"');
  });

  it("con state.databaseName no llama al runner", async () => {
    const runner = new FakeRunner();
    await new DatabaseStep().run(
      makeContext({ runner, state: { completedSteps: [], databaseName: "ejemplo-db" } }),
    );
    expect(runner.calls).toEqual([]);
  });

  it("crea la integración de Neon con nombre, plan y entornos, y verifica las variables", async () => {
    const runner = afterAdd(ENV_OK);
    const context = makeContext({ runner });
    await new DatabaseStep().run(context);
    const add = runner.calls.find((c) => c.args[0] === "integration" && c.args[1] === "add");
    expect(add?.args).toEqual([
      "integration",
      "add",
      "neon",
      "--name",
      "ejemplo-db",
      "--plan",
      "free_v3",
      "--environment",
      "production",
      "--environment",
      "preview",
      "--environment",
      "development",
      "--no-env-pull",
      "--non-interactive",
    ]);
    expect(runner.lines).toContain("vercel env ls production");
    expect(context.state.databaseName).toBe("ejemplo-db");
  });

  it("si la CLI no puede crearla, pide hacerlo a mano y continúa tras confirmar", async () => {
    const runner = afterAdd(ENV_OK, { exitCode: 1, stderr: "requires browser" });
    const prompter = new FakePrompter();
    const context = makeContext({ runner, prompter });
    await new DatabaseStep().run(context);
    expect(prompter.infos.join("\n")).toContain("https://vercel.com/marketplace/neon");
    expect(context.state.databaseName).toBe("ejemplo-db");
  });

  it("si no confirma el alta manual, falla", async () => {
    const runner = afterAdd(ENV_OK, { exitCode: 1 });
    await expect(
      new DatabaseStep().run(makeContext({ runner, prompter: new FakePrompter([], false) })),
    ).rejects.toThrow(/base de datos/);
  });

  it("falla si falta DATABASE_URL_UNPOOLED pero recuerda la base creada", async () => {
    const runner = afterAdd("DATABASE_URL  Encrypted\n");
    const context = makeContext({ runner });
    await expect(new DatabaseStep().run(context)).rejects.toThrow(/DATABASE_URL_UNPOOLED/);
    expect(context.state.databaseName).toBe("ejemplo-db");
  });

  it("al reanudar tras ese fallo no vuelve a crear la integración", async () => {
    const first = afterAdd("DATABASE_URL  Encrypted\n");
    const state = { completedSteps: [] as string[] };
    const context = makeContext({ runner: first, state });
    await new DatabaseStep().run(context).catch(() => {});
    const second = new FakeRunner();
    await new DatabaseStep().run(makeContext({ runner: second, state }));
    expect(second.calls).toEqual([]);
  });

  it("si las variables ya existen en production, no crea otra base y registra el nombre", async () => {
    const runner = new FakeRunner(() => ({ stdout: ENV_OK }));
    const context = makeContext({ runner });
    await new DatabaseStep().run(context);
    expect(runner.lines).toEqual(["vercel env ls production"]);
    expect(context.state.databaseName).toBe("ejemplo-db");
  });

  describe("términos de Neon pendientes", () => {
    const TERMS = JSON.stringify({
      userActionRequired: true,
      verification_uri: "https://vercel.com/equipo/~/integrations/accept-terms/neon?source=cli",
      policy_links: { terms: "https://neon.com/terms", privacy: "https://neon.com/privacy" },
      hint: "accept terms",
      next: [{ command: "vercel integration add neon", when: "Retry install" }],
    });

    /** El primer add pide términos; desde el segundo, funciona. */
    function termsThenOk() {
      let adds = 0;
      let added = false;
      const runner = new FakeRunner((_, args) => {
        if (args[1] === "add") {
          adds += 1;
          if (adds === 1) return { exitCode: 1, stdout: TERMS };
          added = true;
          return undefined;
        }
        if (args[0] === "env") return { stdout: added ? ENV_OK : "" };
        return undefined;
      });
      return runner;
    }

    it("interactivo: muestra la URL y los enlaces, espera confirmación y reintenta una vez", async () => {
      const runner = termsThenOk();
      const prompter = new FakePrompter();
      const context = makeContext({ runner, prompter });
      await new DatabaseStep().run(context);
      const info = prompter.infos.join("\n");
      expect(info).toContain(
        "https://vercel.com/equipo/~/integrations/accept-terms/neon?source=cli",
      );
      expect(info).toContain("https://neon.com/terms");
      expect(prompter.confirmations).toEqual(["¿Ya aceptaste los términos?"]);
      expect(runner.calls.filter((c) => c.args[1] === "add")).toHaveLength(2);
      expect(context.state.databaseName).toBe("ejemplo-db");
    });

    it("interactivo: si no confirma, falla sin reintentar", async () => {
      const runner = termsThenOk();
      await expect(
        new DatabaseStep().run(makeContext({ runner, prompter: new FakePrompter([], false) })),
      ).rejects.toThrow(/términos/);
      expect(runner.calls.filter((c) => c.args[1] === "add")).toHaveLength(1);
    });

    it("no interactivo: falla con la URL y pide volver a correr pnpm desplegar, sin preguntar", async () => {
      const runner = termsThenOk();
      const prompter = new FakePrompter();
      const error = await new DatabaseStep()
        .run(makeContext({ runner, prompter, interactive: false }))
        .catch((e: Error) => e);
      expect((error as Error).message).toContain(
        "https://vercel.com/equipo/~/integrations/accept-terms/neon?source=cli",
      );
      expect((error as Error).message).toContain("pnpm desplegar");
      expect(prompter.confirmations).toEqual([]);
    });
  });

  it("no interactivo: el alta manual falla con un error en español, sin preguntar", async () => {
    const runner = afterAdd(ENV_OK, { exitCode: 1, stderr: "requires browser" });
    const prompter = new FakePrompter();
    await expect(
      new DatabaseStep().run(makeContext({ runner, prompter, interactive: false })),
    ).rejects.toThrow(/https:\/\/vercel\.com\/marketplace\/neon/);
    expect(prompter.confirmations).toEqual([]);
  });
});
