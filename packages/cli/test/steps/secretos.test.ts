import { describe, expect, it } from "vitest";
import { SecretsStep } from "../../src/steps/secrets-step.js";
import { FakePrompter, FakeRunner, makeContext } from "../doubles.js";

describe("secretos", () => {
  it("genera KUORUM_SECRETO y BETTER_AUTH_SECRET en production y preview, solo por input", async () => {
    const runner = new FakeRunner();
    await new SecretsStep().run(makeContext({ runner }));
    const adds = runner.calls.filter((c) => c.args[0] === "env" && c.args[1] === "add");
    expect(adds.map((c) => `${c.args[2]} ${c.args[3]}`)).toEqual([
      "KUORUM_SECRETO production",
      "BETTER_AUTH_SECRET production",
      "KUORUM_SECRETO preview",
      "BETTER_AUTH_SECRET preview",
    ]);
    const valores = adds.map((c) => c.options?.input ?? "");
    for (const valor of valores) expect(valor).toMatch(/^[0-9a-f]{64}$/);
    expect(new Set(valores).size).toBe(4);
    for (const call of adds) {
      for (const valor of valores) expect(call.args.join(" ")).not.toContain(valor);
    }
  });

  it("no pisa los secretos que ya existen", async () => {
    const runner = new FakeRunner((_, args) =>
      args[0] === "env" && args[1] === "ls"
        ? { stdout: "KUORUM_SECRETO  Encrypted  Production\nBETTER_AUTH_SECRET  Encrypted\n" }
        : undefined,
    );
    await new SecretsStep().run(makeContext({ runner }));
    expect(runner.lines.filter((l) => l.startsWith("vercel env add"))).toEqual([]);
    expect(runner.lines.filter((l) => l.includes(" rm "))).toEqual([]);
  });

  it("agrega solo el que falta", async () => {
    const runner = new FakeRunner((_, args) =>
      args[1] === "ls" ? { stdout: "KUORUM_SECRETO  Encrypted\n" } : undefined,
    );
    await new SecretsStep().run(makeContext({ runner }));
    expect(runner.lines.filter((l) => l.startsWith("vercel env add"))).toEqual([
      "vercel env add BETTER_AUTH_SECRET production",
      "vercel env add BETTER_AUTH_SECRET preview",
    ]);
  });

  it("falla sin imprimir el valor si vercel rechaza el alta", async () => {
    const runner = new FakeRunner((_, args) =>
      args[1] === "add" ? { exitCode: 1, stderr: "boom" } : undefined,
    );
    const error = await new SecretsStep().run(makeContext({ runner })).catch((e: Error) => e);
    expect((error as Error).message).toMatch(/boom/);
    expect((error as Error).message).not.toMatch(/[0-9a-f]{64}/);
  });

  it("si el despliegue ya se hizo, avisa que hace falta publicar", async () => {
    const prompter = new FakePrompter();
    await new SecretsStep().run(
      makeContext({ prompter, state: { completedSteps: ["despliegue"] } }),
    );
    expect(prompter.infos.join(" ")).toContain("pnpm publicar");
  });
});
