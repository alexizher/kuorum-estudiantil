import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectStep } from "../../src/steps/project-step.js";
import { FakeRunner, makeContext } from "../doubles.js";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "kuorum-proyecto-"));
  await mkdir(join(dir, ".vercel"));
  await writeFile(
    join(dir, ".vercel", "project.json"),
    JSON.stringify({ projectId: "prj_123", orgId: "team_abc" }),
  );
});
afterEach(() => rm(dir, { recursive: true }));

const token = { read: async () => "tok-secreto" };

function okFetch() {
  return vi.fn(async () => new Response("{}", { status: 200 }));
}

function script(command: string, args: string[]) {
  if (command === "git" && args[0] === "remote") {
    return { stdout: "git@github.com-personal:alguien/repo.git\n" };
  }
  return undefined;
}

describe("proyecto", () => {
  it("con state.projectId no llama al runner ni a la API", async () => {
    const runner = new FakeRunner();
    const fetchFake = okFetch();
    const context = makeContext({
      runner,
      fetch: fetchFake as unknown as typeof fetch,
      cwd: dir,
      state: { completedSteps: [], projectId: "prj_previo" },
    });
    await new ProjectStep(token).run(context);
    expect(runner.calls).toEqual([]);
    expect(fetchFake).not.toHaveBeenCalled();
  });

  it("crea, enlaza, guarda projectId y fija rootDirectory apps/web", async () => {
    const runner = new FakeRunner(script);
    const fetchFake = okFetch();
    const context = makeContext({ runner, fetch: fetchFake as unknown as typeof fetch, cwd: dir });
    await new ProjectStep(token).run(context);

    expect(runner.lines).toContain("vercel project create ejemplo");
    expect(runner.lines).toContain("vercel link --yes --project ejemplo");
    expect(runner.lines).toContain("vercel git connect --yes");
    expect(context.state.projectId).toBe("prj_123");

    const [url, init] = fetchFake.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.vercel.com/v9/projects/prj_123?teamId=team_abc");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(String(init.body))).toEqual({
      rootDirectory: "apps/web",
      framework: "nextjs",
    });
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer tok-secreto");
  });

  it("tolera que el proyecto ya exista", async () => {
    const runner = new FakeRunner((command, args) =>
      args[0] === "project"
        ? { exitCode: 1, stderr: "Error: Project ejemplo already exists" }
        : script(command, args),
    );
    const context = makeContext({ runner, fetch: okFetch() as unknown as typeof fetch, cwd: dir });
    await new ProjectStep(token).run(context);
    expect(context.state.projectId).toBe("prj_123");
  });

  it("no conecta git si no hay remoto origin de GitHub", async () => {
    const runner = new FakeRunner((command, args) =>
      command === "git" ? { exitCode: 2 } : script(command, args),
    );
    await new ProjectStep(token).run(
      makeContext({ runner, fetch: okFetch() as unknown as typeof fetch, cwd: dir }),
    );
    expect(runner.lines).not.toContain("vercel git connect --yes");
  });

  it("si la API responde error, falla sin guardar projectId", async () => {
    const context = makeContext({
      runner: new FakeRunner(script),
      fetch: (async () => new Response("no", { status: 403 })) as unknown as typeof fetch,
      cwd: dir,
    });
    await expect(new ProjectStep(token).run(context)).rejects.toThrow(/403/);
    expect(context.state.projectId).toBeUndefined();
  });

  it("sin token explica cómo darlo y no menciona ningún valor", async () => {
    const context = makeContext({ runner: new FakeRunner(script), cwd: dir });
    await expect(new ProjectStep({ read: async () => undefined }).run(context)).rejects.toThrow(
      /VERCEL_TOKEN/,
    );
  });
});
