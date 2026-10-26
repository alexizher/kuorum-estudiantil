import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateProjectStep } from "../../src/steps/create-project-step.js";
import { GitConnectStep } from "../../src/steps/git-connect-step.js";
import { LinkProjectStep } from "../../src/steps/link-project-step.js";
import { RootDirectoryStep } from "../../src/steps/root-directory-step.js";
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

describe("crear-proyecto", () => {
  it("con state.projectId no llama al runner", async () => {
    const runner = new FakeRunner();
    const context = makeContext({
      runner,
      cwd: dir,
      state: { completedSteps: [], projectId: "prj_previo" },
    });
    await new CreateProjectStep().run(context);
    expect(runner.calls).toEqual([]);
  });

  it("solo crea el proyecto: no enlaza, no llama a la API ni a git", async () => {
    const runner = new FakeRunner(script);
    const fetchFake = okFetch();
    await new CreateProjectStep().run(
      makeContext({ runner, fetch: fetchFake as unknown as typeof fetch, cwd: dir }),
    );
    expect(runner.lines).toEqual(["vercel project create ejemplo"]);
    expect(fetchFake).not.toHaveBeenCalled();
  });

  it("la descripción nombra el proyecto que va a crear", () => {
    const description = new CreateProjectStep().description;
    const texto =
      typeof description === "function" ? description(makeContext().config) : description;
    expect(texto).toContain('"ejemplo"');
  });

  it("si falla por otra razón, lanza el error de la CLI", async () => {
    const runner = new FakeRunner(() => ({ exitCode: 1, stderr: "Error: sin permisos" }));
    await expect(new CreateProjectStep().run(makeContext({ runner, cwd: dir }))).rejects.toThrow(
      /sin permisos/,
    );
  });

  describe("cuando el proyecto ya existe", () => {
    const yaExiste = () => ({ exitCode: 1, stderr: "Error: Project ejemplo already exists" });

    it("pide confirmación nombrando el proyecto y sigue si la persona acepta", async () => {
      const prompter = new FakePrompter([], true);
      await new CreateProjectStep().run(
        makeContext({ runner: new FakeRunner(yaExiste), prompter, cwd: dir }),
      );
      expect(prompter.confirmations).toHaveLength(1);
      expect(prompter.confirmations[0]).toContain('"ejemplo"');
    });

    it("si la persona rechaza, falla", async () => {
      const context = makeContext({
        runner: new FakeRunner(yaExiste),
        prompter: new FakePrompter([], false),
        cwd: dir,
      });
      await expect(new CreateProjectStep().run(context)).rejects.toThrow(/ejemplo/);
    });

    it("sin interacción falla y nombra reuseExistingProject", async () => {
      const prompter = new FakePrompter();
      const context = makeContext({
        runner: new FakeRunner(yaExiste),
        prompter,
        interactive: false,
        cwd: dir,
      });
      await expect(new CreateProjectStep().run(context)).rejects.toThrow(/reuseExistingProject/);
      expect(prompter.confirmations).toEqual([]);
    });

    it("sin interacción sigue si la configuración lo permite", async () => {
      const context = makeContext({
        runner: new FakeRunner(yaExiste),
        interactive: false,
        config: {
          institutionName: "Universidad del Ejemplo",
          shortName: "ejemplo",
          reuseExistingProject: true,
        },
        cwd: dir,
      });
      await expect(new CreateProjectStep().run(context)).resolves.toBeUndefined();
    });
  });
});

describe("enlazar-proyecto", () => {
  it("enlaza la carpeta y guarda projectId", async () => {
    const runner = new FakeRunner(script);
    const context = makeContext({ runner, cwd: dir });
    await new LinkProjectStep().run(context);
    expect(runner.lines).toEqual(["vercel link --yes --project ejemplo"]);
    expect(context.state.projectId).toBe("prj_123");
  });

  it("con state.projectId no vuelve a enlazar", async () => {
    const runner = new FakeRunner();
    const context = makeContext({
      runner,
      cwd: dir,
      state: { completedSteps: [], projectId: "prj_previo" },
    });
    await new LinkProjectStep().run(context);
    expect(runner.calls).toEqual([]);
    expect(context.state.projectId).toBe("prj_previo");
  });

  it("si vercel link falla, no guarda projectId", async () => {
    const context = makeContext({
      runner: new FakeRunner(() => ({ exitCode: 1, stderr: "Error: no" })),
      cwd: dir,
    });
    await expect(new LinkProjectStep().run(context)).rejects.toThrow(/enlazar/);
    expect(context.state.projectId).toBeUndefined();
  });

  it("si no queda .vercel/project.json, falla sin guardar projectId", async () => {
    await rm(join(dir, ".vercel"), { recursive: true });
    const context = makeContext({ runner: new FakeRunner(), cwd: dir });
    await expect(new LinkProjectStep().run(context)).rejects.toThrow(/project\.json/);
    expect(context.state.projectId).toBeUndefined();
  });
});

describe("directorio-raiz", () => {
  it("fija rootDirectory apps/web con el token y el equipo del enlace", async () => {
    const fetchFake = okFetch();
    const runner = new FakeRunner();
    await new RootDirectoryStep(token).run(
      makeContext({ runner, fetch: fetchFake as unknown as typeof fetch, cwd: dir }),
    );
    expect(runner.calls).toEqual([]);
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

  it("sin equipo en el enlace no agrega teamId", async () => {
    await writeFile(join(dir, ".vercel", "project.json"), JSON.stringify({ projectId: "prj_9" }));
    const fetchFake = okFetch();
    await new RootDirectoryStep(token).run(
      makeContext({ fetch: fetchFake as unknown as typeof fetch, cwd: dir }),
    );
    const [url] = fetchFake.mock.calls[0] as unknown as [string];
    expect(url).toBe("https://api.vercel.com/v9/projects/prj_9");
  });

  it("si la API responde error, falla nombrando el código", async () => {
    const context = makeContext({
      fetch: (async () => new Response("no", { status: 403 })) as unknown as typeof fetch,
      cwd: dir,
    });
    await expect(new RootDirectoryStep(token).run(context)).rejects.toThrow(/403/);
  });

  it("sin token explica cómo darlo", async () => {
    const context = makeContext({ fetch: okFetch() as unknown as typeof fetch, cwd: dir });
    await expect(
      new RootDirectoryStep({ read: async () => undefined }).run(context),
    ).rejects.toThrow(/VERCEL_TOKEN/);
  });
});

describe("conectar-repositorio", () => {
  it("conecta git si el remoto origin es de GitHub", async () => {
    const runner = new FakeRunner(script);
    await new GitConnectStep().run(makeContext({ runner, cwd: dir }));
    expect(runner.lines).toEqual(["git remote get-url origin", "vercel git connect --yes"]);
  });

  it("no conecta git si no hay remoto origin", async () => {
    const runner = new FakeRunner((command) => (command === "git" ? { exitCode: 2 } : undefined));
    await new GitConnectStep().run(makeContext({ runner, cwd: dir }));
    expect(runner.lines).not.toContain("vercel git connect --yes");
  });

  it("no conecta git si el host del remoto solo empieza por github.com", async () => {
    const runner = new FakeRunner((command) =>
      command === "git"
        ? { stdout: "https://github.com.otro.dominio/alguien/repo.git\n" }
        : undefined,
    );
    await new GitConnectStep().run(makeContext({ runner, cwd: dir }));
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
      await new GitConnectStep().run(
        makeContext({ runner: connectFails(LOGIN_ERROR), prompter, cwd: dir }),
      );
      expect(prompter.infos.join("\n")).toContain(LOGIN_ERROR);
    });

    it("con Login Connection explica cómo conectar GitHub y que pnpm desplegar sigue funcionando", async () => {
      const prompter = new FakePrompter();
      await new GitConnectStep().run(
        makeContext({ runner: connectFails(LOGIN_ERROR), prompter, cwd: dir }),
      );
      const aviso = prompter.infos.join("\n");
      expect(aviso).toContain("Login Connections");
      expect(aviso).toContain("pnpm desplegar");
    });

    it("con otro error no menciona Login Connections", async () => {
      const prompter = new FakePrompter();
      await new GitConnectStep().run(
        makeContext({ runner: connectFails("Error: algo distinto"), prompter, cwd: dir }),
      );
      expect(prompter.infos.join("\n")).toContain("Error: algo distinto");
      expect(prompter.infos.join("\n")).not.toContain("Login Connections");
    });
  });
});
