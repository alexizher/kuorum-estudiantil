import { describe, expect, it } from "vitest";
import { RequirementsStep } from "../../src/steps/requirements-step.js";
import { FakePrompter, FakeRunner, makeContext } from "../doubles.js";

function runnerWith(overrides: Record<string, { exitCode?: number; stdout?: string }>) {
  return new FakeRunner((command) => overrides[command] ?? { stdout: "v24.1.0\n" });
}

describe("requisitos", () => {
  it("pasa cuando node, pnpm, git y vercel existen", async () => {
    const runner = runnerWith({});
    await new RequirementsStep().run(makeContext({ runner }));
    expect(runner.lines).toEqual([
      "node --version",
      "pnpm --version",
      "git --version",
      "vercel --version",
    ]);
  });

  it("falla si node es menor que 22", async () => {
    const runner = runnerWith({ node: { stdout: "v20.11.0\n" } });
    await expect(new RequirementsStep().run(makeContext({ runner }))).rejects.toThrow(/Node 22/);
  });

  it("falla si falta git", async () => {
    const runner = runnerWith({ git: { exitCode: 127 } });
    await expect(new RequirementsStep().run(makeContext({ runner }))).rejects.toThrow(/git/);
  });

  it("si falta vercel, ofrece instalarlo y lo instala tras confirmar", async () => {
    const runner = runnerWith({ vercel: { exitCode: 1 } });
    await new RequirementsStep().run(makeContext({ runner }));
    expect(runner.lines).toContain("pnpm add -g vercel@64");
  });

  it("si falta vercel y se rechaza instalar, falla sin instalar", async () => {
    const runner = runnerWith({ vercel: { exitCode: 1 } });
    const prompter = new FakePrompter([], false);
    await expect(new RequirementsStep().run(makeContext({ runner, prompter }))).rejects.toThrow(
      /vercel/,
    );
    expect(runner.lines).not.toContain("pnpm add -g vercel@64");
  });
});
