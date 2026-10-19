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
});
