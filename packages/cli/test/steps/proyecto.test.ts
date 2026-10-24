import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectStep } from "../../src/steps/project-step.js";
import { FakePrompter, FakeRunner, makeContext } from "../doubles.js";

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
      sourceFilesOutsideRootDirectory: true,
    });
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer tok-secreto");
  });

  describe("cuando el proyecto ya existe", () => {
    const yaExiste = (command: string, args: string[]) =>
      args[0] === "project"
        ? { exitCode: 1, stderr: "Error: Project ejemplo already exists" }
        : script(command, args);

    it("pide confirmación nombrando el proyecto y lo reutiliza si la persona acepta", async () => {
      const prompter = new FakePrompter([], true);
      const runner = new FakeRunner(yaExiste);
      const context = makeContext({
        runner,
        prompter,
        fetch: okFetch() as unknown as typeof fetch,
        cwd: dir,
      });
      await new ProjectStep(token).run(context);
      expect(prompter.confirmations).toHaveLength(1);
      expect(prompter.confirmations[0]).toContain('"ejemplo"');
      expect(context.state.projectId).toBe("prj_123");
    });

    it("si la persona rechaza, falla sin enlazar ni tocar la API", async () => {
      const runner = new FakeRunner(yaExiste);
      const fetchFake = okFetch();
      const context = makeContext({
        runner,
        prompter: new FakePrompter([], false),
        fetch: fetchFake as unknown as typeof fetch,
        cwd: dir,
      });
      await expect(new ProjectStep(token).run(context)).rejects.toThrow(/ejemplo/);
      expect(runner.lines.some((l) => l.startsWith("vercel link"))).toBe(false);
      expect(fetchFake).not.toHaveBeenCalled();
      expect(context.state.projectId).toBeUndefined();
    });

    it("sin interacción falla y nombra reuseExistingProject", async () => {
      const prompter = new FakePrompter();
      const runner = new FakeRunner(yaExiste);
      const context = makeContext({ runner, prompter, interactive: false, cwd: dir });
      await expect(new ProjectStep(token).run(context)).rejects.toThrow(/reuseExistingProject/);
      expect(prompter.confirmations).toEqual([]);
      expect(runner.lines.some((l) => l.startsWith("vercel link"))).toBe(false);
    });

    it("sin interacción lo reutiliza si la configuración lo permite", async () => {
      const context = makeContext({
        runner: new FakeRunner(yaExiste),
        interactive: false,
        config: {
          institutionName: "Universidad del Ejemplo",
          shortName: "ejemplo",
          reuseExistingProject: true,
        },
        fetch: okFetch() as unknown as typeof fetch,
        cwd: dir,
      });
      await new ProjectStep(token).run(context);
      expect(context.state.projectId).toBe("prj_123");
    });
  });

  it("la descripción nombra el proyecto que va a crear", () => {
    const description = new ProjectStep(token).description;
    const texto =
      typeof description === "function" ? description(makeContext().config) : description;
    expect(texto).toContain('"ejemplo"');
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

  it("no conecta git si el host del remoto solo empieza por github.com", async () => {
    const runner = new FakeRunner((command, args) =>
      command === "git"
        ? { stdout: "https://github.com.otro.dominio/alguien/repo.git\n" }
        : script(command, args),
    );
    await new ProjectStep(token).run(
      makeContext({ runner, fetch: okFetch() as unknown as typeof fetch, cwd: dir }),
    );
    expect(runner.lines).not.toContain("vercel git connect --yes");
  });

  describe("si vercel git connect falla", () => {
    const LOGIN_ERROR =
      "Error: Failed to link alexizher/kuorum-estudiantil. You need to add a Login Connection to your GitHub account first. (400)";

    function connectFails(stderr: string) {
      return new FakeRunner((command, args) =>
        command === "vercel" && args[0] === "git" ? { exitCode: 1, stderr } : script(command, args),
      );
    }

    it("incluye la línea de error de la CLI en el aviso y no falla", async () => {
      const prompter = new FakePrompter();
      const context = makeContext({
        runner: connectFails(LOGIN_ERROR),
        prompter,
        fetch: okFetch() as unknown as typeof fetch,
        cwd: dir,
      });
      await new ProjectStep(token).run(context);
      expect(prompter.infos.join("\n")).toContain(LOGIN_ERROR);
      expect(context.state.projectId).toBe("prj_123");
    });

    it("con Login Connection explica cómo conectar GitHub y que pnpm desplegar sigue funcionando", async () => {
      const prompter = new FakePrompter();
      await new ProjectStep(token).run(
        makeContext({
          runner: connectFails(LOGIN_ERROR),
          prompter,
          fetch: okFetch() as unknown as typeof fetch,
          cwd: dir,
        }),
      );
      const aviso = prompter.infos.join("\n");
      expect(aviso).toContain("Login Connections");
      expect(aviso).toContain("pnpm desplegar");
    });

    it("con otro error no menciona Login Connections", async () => {
      const prompter = new FakePrompter();
      await new ProjectStep(token).run(
        makeContext({
          runner: connectFails("Error: algo distinto"),
          prompter,
          fetch: okFetch() as unknown as typeof fetch,
          cwd: dir,
        }),
      );
      expect(prompter.infos.join("\n")).toContain("Error: algo distinto");
      expect(prompter.infos.join("\n")).not.toContain("Login Connections");
    });
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
