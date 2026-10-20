import { describe, expect, it } from "vitest";
import { parseCommand } from "../src/cli.js";
import { DeployWizard } from "../src/wizard/deploy-wizard.js";
import type { Step } from "../src/wizard/step.js";
import { FakePrompter, FakeRunner, MemoryStateStore } from "./doubles.js";

const config = { institutionName: "Universidad del Ejemplo", shortName: "ejemplo" };
const environment = { fetch, sleep: async () => {}, cwd: "/tmp", interactive: true };

function paso(id: string, log: string[]): Step {
  return {
    id,
    description: id,
    async run() {
      log.push(id);
    },
  };
}

describe("publicar", () => {
  it("se reconoce como comando, sin --config", () => {
    expect(parseCommand(["publicar"])).toEqual({ kind: "publicar" });
    expect(parseCommand(["publicar", "--config", "a.json"])).toEqual({ kind: "uso" });
  });

  it("con repetirPasos corre los pasos aunque estén completados y no cambia completedSteps", async () => {
    const log: string[] = [];
    const store = new MemoryStateStore({
      completedSteps: ["despliegue", "verificacion"],
      config,
    });
    const wizard = new DeployWizard(
      [paso("despliegue", log), paso("verificacion", log)],
      store,
      { load: async () => config },
      new FakePrompter(),
      new FakeRunner(),
      environment,
      { repetirPasos: true },
    );
    expect(await wizard.run()).toBe(0);
    expect(log).toEqual(["despliegue", "verificacion"]);
    expect(store.state.completedSteps).toEqual(["despliegue", "verificacion"]);
  });

  it("un paso que devuelve omitido no queda marcado como completado", async () => {
    const store = new MemoryStateStore({ completedSteps: [], config });
    const omitido: Step = { id: "x", description: "x", run: async () => "omitido" };
    const wizard = new DeployWizard(
      [omitido],
      store,
      { load: async () => config },
      new FakePrompter(),
      new FakeRunner(),
      environment,
    );
    expect(await wizard.run()).toBe(0);
    expect(store.state.completedSteps).toEqual([]);
  });
});
