import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildSteps } from "../../src/composition.js";
import { DeployWizard } from "../../src/wizard/deploy-wizard.js";
import { StateStore } from "../../src/wizard/state-store.js";
import { FakePrompter, FakeRunner } from "../doubles.js";

describe("asistente completo con dobles", () => {
  it("corre los 13 pasos y el archivo de estado no guarda ningún valor de input ni el token", async () => {
    const dir = await mkdtemp(join(tmpdir(), "kuorum-full-"));
    try {
      await mkdir(join(dir, ".vercel"));
      await writeFile(
        join(dir, ".vercel", "project.json"),
        JSON.stringify({ projectId: "prj_1", orgId: "team_1" }),
      );
      const runner = new FakeRunner((command, args) => {
        if (command === "node") return { stdout: "v24.0.0\n" };
        if (args[0] === "env" && args[1] === "ls")
          return { stdout: "DATABASE_URL\nDATABASE_URL_UNPOOLED\n" };
        if (command === "pnpm") return { stdout: "clave-generada-del-admin\n" };
        if (args[0] === "deploy") return { stdout: "https://ejemplo.vercel.app\n" };
        return undefined;
      });
      const config = {
        institutionName: "Valor Sensible Del Input",
        shortName: "ejemplo",
        adminEmail: "mesa@ejemplo.test",
        adminName: "Mesa",
      };
      const fetchFake = (async () =>
        new Response("{}", { status: 200 })) as unknown as typeof fetch;
      const statePath = join(dir, ".kuorum", "despliegue.json");
      const wizard = new DeployWizard(
        buildSteps({ read: async () => "tok-super-secreto" }),
        new StateStore(statePath),
        { load: async () => config },
        new FakePrompter(),
        runner,
        { fetch: fetchFake, sleep: async () => {}, cwd: dir, interactive: true },
      );
      expect(await wizard.run()).toBe(0);
      const state = JSON.parse(await readFile(statePath, "utf8")) as {
        completedSteps: string[];
        config: unknown;
      };
      expect(state.completedSteps).toEqual([
        "requisitos",
        "sesion-vercel",
        "crear-proyecto",
        "enlazar-proyecto",
        "directorio-raiz",
        "conectar-repositorio",
        "base-de-datos",
        "variables",
        "secretos",
        "despliegue",
        "verificacion",
        "administrador",
        "resumen",
      ]);
      const raw = await readFile(statePath, "utf8");
      const inputs = runner.calls.flatMap((c) => (c.options?.input ? [c.options.input] : []));
      expect(inputs.length).toBeGreaterThan(0);
      // state.config guarda el nombre de la institución a propósito (no es secreto);
      // fuera de config no debe aparecer ningún valor pasado por input.
      const outsideConfig = JSON.stringify({ ...state, config: undefined });
      for (const input of inputs) expect(outsideConfig).not.toContain(input);
      expect(raw).not.toContain("tok-super-secreto");
      expect(raw).not.toContain("clave-generada-del-admin");
    } finally {
      await rm(dir, { recursive: true });
    }
  });
});
