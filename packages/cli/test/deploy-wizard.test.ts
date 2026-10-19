import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FileConfigSource, InteractiveConfigSource } from "../src/config/config-source.js";
import {
  MissingConfigError,
  parseDeployConfig,
  slugify,
  validateField,
  type DeployConfig,
} from "../src/config/deploy-config.js";
import { DeployWizard } from "../src/wizard/deploy-wizard.js";
import { StateStore } from "../src/wizard/state-store.js";
import type { Step } from "../src/wizard/step.js";
import { FakePrompter, FakeRunner, MemoryStateStore } from "./doubles.js";

const config: DeployConfig = { institutionName: "Universidad del Ejemplo", shortName: "ejemplo" };
const fixedSource = { load: async () => config };
const environment = { fetch, sleep: async () => {}, cwd: "/tmp" };

function stepOf(id: string, log: string[], fail?: string): Step {
  return {
    id,
    description: `paso ${id}`,
    async run() {
      if (fail) throw new Error(fail);
      log.push(id);
    },
  };
}

function build(steps: Step[], store: MemoryStateStore, source = fixedSource) {
  const prompter = new FakePrompter();
  const runner = new FakeRunner();
  const wizard = new DeployWizard(steps, store, source, prompter, runner, environment);
  return { wizard, prompter, runner };
}

describe("DeployWizard", () => {
  it("corre los pasos en orden y los marca como completados", async () => {
    const log: string[] = [];
    const store = new MemoryStateStore();
    const { wizard, prompter } = build([stepOf("a", log), stepOf("b", log)], store);
    expect(await wizard.run()).toBe(0);
    expect(log).toEqual(["a", "b"]);
    expect(store.state.completedSteps).toEqual(["a", "b"]);
    expect(store.state.config).toEqual(config);
    expect(prompter.infos).toEqual(["paso a", "paso b"]);
  });

  it("salta los pasos ya completados", async () => {
    const log: string[] = [];
    const store = new MemoryStateStore({ completedSteps: ["a"] });
    const { wizard } = build([stepOf("a", log), stepOf("b", log)], store);
    expect(await wizard.run()).toBe(0);
    expect(log).toEqual(["b"]);
  });

  it("si un paso lanza devuelve 1, conserva lo completado y muestra el mensaje", async () => {
    const log: string[] = [];
    const store = new MemoryStateStore();
    const { wizard, prompter } = build([stepOf("a", log), stepOf("b", log, "falló b")], store);
    expect(await wizard.run()).toBe(1);
    expect(store.state.completedSteps).toEqual(["a"]);
    expect(prompter.failures).toEqual(["falló b"]);
  });

  it("reutiliza la configuración guardada sin volver a pedirla", async () => {
    const store = new MemoryStateStore({ completedSteps: [], config });
    const failing = {
      load: async (): Promise<DeployConfig> => {
        throw new Error("no debía llamarse");
      },
    };
    const { wizard } = build([], store, failing);
    expect(await wizard.run()).toBe(0);
  });

  it("con configuración sin shortName devuelve 1 sin llamar al runner ni a los pasos", async () => {
    const dir = await mkdtemp(join(tmpdir(), "kuorum-cli-"));
    try {
      const path = join(dir, "config.json");
      await writeFile(path, JSON.stringify({ institutionName: "Universidad del Ejemplo" }));
      const log: string[] = [];
      const { wizard, prompter, runner } = build(
        [stepOf("a", log)],
        new MemoryStateStore(),
        new FileConfigSource(path),
      );
      expect(await wizard.run()).toBe(1);
      expect(runner.calls).toEqual([]);
      expect(log).toEqual([]);
      expect(prompter.failures[0]).toContain("shortName");
    } finally {
      await rm(dir, { recursive: true });
    }
  });
});

describe("configuración", () => {
  it("FileConfigSource lanza MissingConfigError con el campo", async () => {
    const dir = await mkdtemp(join(tmpdir(), "kuorum-cli-"));
    try {
      const path = join(dir, "config.json");
      await writeFile(path, JSON.stringify({ institutionName: "Universidad del Ejemplo" }));
      const error = await new FileConfigSource(path).load().catch((e: unknown) => e);
      expect(error).toBeInstanceOf(MissingConfigError);
      expect((error as MissingConfigError).field).toBe("shortName");
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it("rechaza un shortName con mayúsculas, tildes o espacios y nombra el campo", () => {
    expect(() =>
      parseDeployConfig({ institutionName: "UdeA", shortName: "UdeA Medellín" }),
    ).toThrow(/shortName/);
    expect(validateField("shortName", "UdeA Medellín")).toBeDefined();
    expect(validateField("shortName", "udea-medellin")).toBeUndefined();
  });

  it("sugiere el shortName con slugify", async () => {
    expect(slugify("Universidad del Ejemplo")).toBe("universidad-del-ejemplo");
    expect(slugify("  Educación Ñandú  ")).toBe("educacion-nandu");
    const prompter = new FakePrompter(["Universidad del Ejemplo"]);
    const loaded = await new InteractiveConfigSource(prompter).load();
    expect(loaded.shortName).toBe("universidad-del-ejemplo");
  });
});

describe("StateStore", () => {
  it("devuelve estado vacío si no existe, crea el directorio y guarda atómicamente", async () => {
    const dir = await mkdtemp(join(tmpdir(), "kuorum-cli-"));
    try {
      const path = join(dir, ".kuorum", "despliegue.json");
      const store = new StateStore(path);
      expect(await store.load()).toEqual({ completedSteps: [] });
      await store.save({ completedSteps: ["a"], projectId: "p1" });
      expect(JSON.parse(await readFile(path, "utf8"))).toEqual({
        completedSteps: ["a"],
        projectId: "p1",
      });
      expect(await store.load()).toEqual({ completedSteps: ["a"], projectId: "p1" });
    } finally {
      await rm(dir, { recursive: true });
    }
  });
});
