import { describe, expect, it } from "vitest";
import { DatabaseStep } from "../../src/steps/database-step.js";
import { FakePrompter, FakeRunner, makeContext } from "../doubles.js";

const ENV_OK =
  "DATABASE_URL  Encrypted  Production\nDATABASE_URL_UNPOOLED  Encrypted  Production\n";

describe("base-de-datos", () => {
  it("con state.databaseName no llama al runner", async () => {
    const runner = new FakeRunner();
    await new DatabaseStep().run(
      makeContext({ runner, state: { completedSteps: [], databaseName: "ejemplo-db" } }),
    );
    expect(runner.calls).toEqual([]);
  });

  it("crea la integración de Neon con nombre, plan y entornos, y verifica las variables", async () => {
    const runner = new FakeRunner((_, args) =>
      args[0] === "env" ? { stdout: ENV_OK } : undefined,
    );
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
    ]);
    expect(runner.lines).toContain("vercel env ls");
    expect(context.state.databaseName).toBe("ejemplo-db");
  });

  it("si la CLI no puede crearla, pide hacerlo a mano y continúa tras confirmar", async () => {
    const runner = new FakeRunner((_, args) =>
      args[1] === "add" ? { exitCode: 1, stderr: "requires browser" } : { stdout: ENV_OK },
    );
    const prompter = new FakePrompter();
    const context = makeContext({ runner, prompter });
    await new DatabaseStep().run(context);
    expect(prompter.infos.join("\n")).toContain("https://vercel.com/marketplace/neon");
    expect(context.state.databaseName).toBe("ejemplo-db");
  });

  it("si no confirma el alta manual, falla", async () => {
    const runner = new FakeRunner((_, args) => (args[1] === "add" ? { exitCode: 1 } : undefined));
    await expect(
      new DatabaseStep().run(makeContext({ runner, prompter: new FakePrompter([], false) })),
    ).rejects.toThrow(/base de datos/);
  });

  it("falla si falta DATABASE_URL_UNPOOLED", async () => {
    const runner = new FakeRunner((_, args) =>
      args[0] === "env" ? { stdout: "DATABASE_URL  Encrypted\n" } : undefined,
    );
    const context = makeContext({ runner });
    await expect(new DatabaseStep().run(context)).rejects.toThrow(/DATABASE_URL_UNPOOLED/);
    expect(context.state.databaseName).toBeUndefined();
  });
});
