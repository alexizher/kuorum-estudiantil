import { describe, expect, it } from "vitest";
import { VercelSessionStep } from "../../src/steps/vercel-session-step.js";
import { FakeRunner, makeContext } from "../doubles.js";

describe("sesion-vercel", () => {
  it("no inicia sesión si whoami sale con 0", async () => {
    const runner = new FakeRunner();
    await new VercelSessionStep().run(makeContext({ runner }));
    expect(runner.lines).toEqual(["vercel whoami"]);
  });

  it("corre vercel login con la terminal heredada si whoami falla", async () => {
    const runner = new FakeRunner((_, args) =>
      args[0] === "whoami" ? { exitCode: 1 } : undefined,
    );
    await new VercelSessionStep().run(makeContext({ runner }));
    expect(runner.lines).toEqual(["vercel whoami", "vercel login"]);
    expect(runner.calls[1]?.options?.inheritStdio).toBe(true);
  });

  it("falla si el login no termina bien", async () => {
    const runner = new FakeRunner(() => ({ exitCode: 1 }));
    await expect(new VercelSessionStep().run(makeContext({ runner }))).rejects.toThrow(/sesión/);
  });
});
