import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FileConfigSource, InteractiveConfigSource } from "../src/config/config-source.js";
import {
  InvalidConfigError,
  MissingConfigError,
  parseDeployConfig,
  slugify,
  validateField,
  type DeployConfig,
} from "../src/config/deploy-config.js";
import { DeployWizard } from "../src/wizard/deploy-wizard.js";
import { PromptCancelledError } from "../src/io/prompter.js";
import { CorruptStateError, StateStore } from "../src/wizard/state-store.js";
import type { Step } from "../src/wizard/step.js";
import { FakePrompter, FakeRunner, MemoryStateStore } from "./doubles.js";

const config: DeployConfig = { institutionName: "Universidad del Ejemplo", shortName: "ejemplo" };
const fixedSource = { load: async () => config };
const environment = { fetch, sleep: async () => {}, cwd: "/tmp", interactive: true };

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

describe("DeployWizard, endurecimiento", () => {
  it("con shortName inválido devuelve 1 y muestra el mensaje de InvalidConfigError", async () => {
    const dir = await mkdtemp(join(tmpdir(), "kuorum-cli-"));
    try {
      const path = join(dir, "config.json");
      await writeFile(
        path,
        JSON.stringify({ institutionName: "UdeA", shortName: "UdeA Medellín" }),
      );
      const log: string[] = [];
      const { wizard, prompter } = build(
        [stepOf("a", log)],
        new MemoryStateStore(),
        new FileConfigSource(path),
      );
      expect(await wizard.run()).toBe(1);
      expect(log).toEqual([]);
      expect(prompter.failures).toHaveLength(1);
      expect(prompter.failures[0]).toContain("shortName");
      expect(new InvalidConfigError("shortName", "x")).toBeInstanceOf(Error);
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it("al reanudar, un paso que falla conserva los completados y no repite los anteriores", async () => {
    const log: string[] = [];
    const store = new MemoryStateStore({ completedSteps: ["a"], config });
    const { wizard, prompter } = build(
      [stepOf("a", log), stepOf("b", log, "falló b otra vez"), stepOf("c", log)],
      store,
    );
    expect(await wizard.run()).toBe(1);
    expect(log).toEqual([]);
    expect(store.state.completedSteps).toEqual(["a"]);
    expect(prompter.failures).toEqual(["falló b otra vez"]);
  });

  it("si la persona cancela un paso, devuelve 1 sin un segundo mensaje de error", async () => {
    const cancelling: Step = {
      id: "x",
      description: "paso x",
      async run() {
        throw new PromptCancelledError();
      },
    };
    const { wizard, prompter } = build([cancelling], new MemoryStateStore());
    expect(await wizard.run()).toBe(1);
    expect(prompter.failures).toEqual([]);
  });

  it("si cancela al pedir la configuración, devuelve 1 sin mensaje adicional", async () => {
    const source = {
      load: async (): Promise<DeployConfig> => {
        throw new PromptCancelledError();
      },
    };
    const { wizard, prompter } = build([], new MemoryStateStore(), source);
    expect(await wizard.run()).toBe(1);
    expect(prompter.failures).toEqual([]);
  });

  it("con un archivo de estado dañado devuelve 1 con mensaje en español", async () => {
    const store = {
      load: async () => {
        throw new CorruptStateError("/x/.kuorum/despliegue.json");
      },
      save: async () => {},
    };
    const prompter = new FakePrompter();
    const wizard = new DeployWizard(
      [],
      store,
      fixedSource,
      prompter,
      new FakeRunner(),
      environment,
    );
    expect(await wizard.run()).toBe(1);
    expect(prompter.failures[0]).toContain("despliegue.json");
    expect(prompter.failures[0]).toContain("dañado");
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

describe("StateStore, archivo dañado", () => {
  it("lanza CorruptStateError si el JSON no se puede leer", async () => {
    const dir = await mkdtemp(join(tmpdir(), "kuorum-cli-"));
    try {
      const path = join(dir, "despliegue.json");
      await writeFile(path, "{ esto no es json");
      await expect(new StateStore(path).load()).rejects.toBeInstanceOf(CorruptStateError);
      await writeFile(path, JSON.stringify({ otraCosa: 1 }));
      await expect(new StateStore(path).load()).rejects.toBeInstanceOf(CorruptStateError);
    } finally {
      await rm(dir, { recursive: true });
    }
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

  it("resuelve la descripción del paso con la configuración", async () => {
    const step: Step = {
      id: "x",
      description: (c) => `Creando "${c.shortName}"`,
      async run() {},
    };
    const { wizard, prompter } = build([step], new MemoryStateStore());
    await wizard.run();
    expect(prompter.infos).toEqual(['Creando "ejemplo"']);
  });

  describe("con --config y estado guardado", () => {
    const noInteractive = { ...environment, interactive: false };
    const distinta: DeployConfig = { ...config, shortName: "otro-nombre" };

    it("si el archivo difiere de lo guardado falla y explica cómo empezar de nuevo", async () => {
      const log: string[] = [];
      const store = new MemoryStateStore({ completedSteps: [], config });
      const prompter = new FakePrompter();
      const wizard = new DeployWizard(
        [stepOf("a", log)],
        store,
        { load: async () => distinta },
        prompter,
        new FakeRunner(),
        noInteractive,
      );
      expect(await wizard.run()).toBe(1);
      expect(log).toEqual([]);
      expect(prompter.failures[0]).toContain(".kuorum/despliegue.json");
      expect(store.state.config).toEqual(config);
    });

    it("si el archivo coincide con lo guardado continúa", async () => {
      const log: string[] = [];
      const store = new MemoryStateStore({ completedSteps: [], config });
      const wizard = new DeployWizard(
        [stepOf("a", log)],
        store,
        { load: async () => ({ ...config }) },
        new FakePrompter(),
        new FakeRunner(),
        noInteractive,
      );
      expect(await wizard.run()).toBe(0);
      expect(log).toEqual(["a"]);
    });
  });
});
