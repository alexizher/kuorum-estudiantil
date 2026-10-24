import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CorruptStateError, StateStore } from "../src/wizard/state-store.js";

let dir: string;
let path: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "kuorum-estado-"));
  path = join(dir, "despliegue.json");
});
afterEach(() => rm(dir, { recursive: true }));

async function loadWith(content: unknown) {
  await writeFile(path, JSON.stringify(content));
  return new StateStore(path).load();
}

describe("StateStore, validación del archivo", () => {
  it("acepta un estado completo", async () => {
    const state = {
      completedSteps: ["requisitos", "proyecto"],
      projectId: "prj_123",
      productionUrl: "https://ejemplo.vercel.app",
      databaseName: "ejemplo-db",
      config: { institutionName: "Universidad del Ejemplo", shortName: "ejemplo" },
    };
    expect(await loadWith(state)).toEqual(state);
  });

  it.each([
    ["completedSteps con algo que no es texto", { completedSteps: [1] }],
    ["projectId que no es texto", { completedSteps: [], projectId: 42 }],
    ["productionUrl que no es texto", { completedSteps: [], productionUrl: true }],
    ["databaseName que no es texto", { completedSteps: [], databaseName: {} }],
    ["config sin shortName", { completedSteps: [], config: { institutionName: "Uni" } }],
    [
      "config con shortName inválido",
      { completedSteps: [], config: { institutionName: "Universidad", shortName: "A B" } },
    ],
    ["un arreglo en lugar de un objeto", []],
    ["null", null],
  ])("rechaza %s con CorruptStateError", async (_caso, content) => {
    await expect(loadWith(content)).rejects.toBeInstanceOf(CorruptStateError);
  });

  it("el error nombra la ruta del archivo", async () => {
    await expect(loadWith({ completedSteps: "no" })).rejects.toThrow(path);
  });
});
