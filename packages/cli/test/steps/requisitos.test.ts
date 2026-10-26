import { describe, expect, it } from "vitest";
import { RequirementsStep } from "../../src/steps/requirements-step.js";
import { FakePrompter, FakeRunner, makeContext } from "../doubles.js";

function runnerWith(overrides: Record<string, { exitCode?: number; stdout?: string }>) {
  return new FakeRunner((command) => overrides[command] ?? { stdout: "v24.1.0\n" });
}

/** vercel falla hasta que se corre pnpm add -g vercel@64. */
function runnerThatInstallsVercel() {
  let installed = false;
  return new FakeRunner((command, args) => {
    if (command === "pnpm" && args[0] === "add") installed = true;
    if (command === "vercel") return { exitCode: installed ? 0 : 1 };
    return { stdout: "v24.1.0\n" };
  });
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
    const runner = runnerThatInstallsVercel();
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

  it("no interactivo: si falta vercel falla explicando cómo instalarlo, sin preguntar", async () => {
    const runner = runnerWith({ vercel: { exitCode: 1 } });
    const prompter = new FakePrompter();
    await expect(
      new RequirementsStep().run(makeContext({ runner, prompter, interactive: false })),
    ).rejects.toThrow(/pnpm add -g vercel@64/);
    expect(prompter.confirmations).toEqual([]);
    expect(runner.lines).not.toContain("pnpm add -g vercel@64");
  });

  describe("después de instalar vercel", () => {
    function installedButHidden(binDir: { exitCode?: number; stdout?: string }) {
      return new FakeRunner((command, args) => {
        if (command === "vercel") return { exitCode: 127 };
        if (command === "pnpm" && args[0] === "bin") return binDir;
        return { stdout: "v24.1.0\n" };
      });
    }

    it("comprueba que vercel --version funcione", async () => {
      const runner = runnerThatInstallsVercel();
      await new RequirementsStep().run(makeContext({ runner }));
      expect(runner.lines.slice(-2)).toEqual(["pnpm add -g vercel@64", "vercel --version"]);
    });

    it("si vercel sigue sin aparecer, explica cómo agregar el directorio global al PATH", async () => {
      const runner = installedButHidden({ stdout: "/home/ana/.local/share/pnpm\n" });
      const error = await new RequirementsStep()
        .run(makeContext({ runner }))
        .catch((e: unknown) => e as Error);
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("PATH");
      expect((error as Error).message).toContain("/home/ana/.local/share/pnpm");
      expect((error as Error).message).toContain("pnpm setup");
    });

    it("si no puede averiguar el directorio global, igual menciona PATH y pnpm setup", async () => {
      const runner = installedButHidden({ exitCode: 1 });
      await expect(new RequirementsStep().run(makeContext({ runner }))).rejects.toThrow(
        /PATH[\s\S]*pnpm setup/,
      );
    });
  });
});
