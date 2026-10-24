import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DeployStep } from "../../src/steps/deploy-step.js";
import { FakeRunner, makeContext } from "../doubles.js";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");
const salidaReal = readFileSync(join(fixturesDir, "vercel-deploy-prod.json"), "utf8");

function salidaJson(overrides: { status?: string; deployment?: Record<string, unknown> }): string {
  const base = JSON.parse(salidaReal) as { status: string; deployment: Record<string, unknown> };
  return JSON.stringify({
    ...base,
    status: overrides.status ?? base.status,
    deployment: { ...base.deployment, ...overrides.deployment },
  });
}

describe("despliegue", () => {
  it("pide el despliegue sin prompts y guarda la URL de producción de la salida JSON real", async () => {
    const runner = new FakeRunner(() => ({ stdout: salidaReal }));
    const context = makeContext({ runner });
    await new DeployStep().run(context);
    expect(runner.lines).toEqual(["vercel deploy --prod --yes --non-interactive"]);
    expect(context.state.productionUrl).toBe("https://kuorum-estudiantil-demo.vercel.app");
  });

  it("usa deployment.url si la salida JSON no trae productionUrl", async () => {
    const stdout = salidaJson({ deployment: { productionUrl: undefined } });
    const context = makeContext({ runner: new FakeRunner(() => ({ stdout })) });
    await new DeployStep().run(context);
    expect(context.state.productionUrl).toBe(
      "https://kuorum-estudiantil-demo-msnipu532.vercel.app",
    );
  });

  it("falla si la salida JSON trae status distinto de ok", async () => {
    const stdout = salidaJson({ status: "error" });
    const context = makeContext({ runner: new FakeRunner(() => ({ stdout })) });
    await expect(new DeployStep().run(context)).rejects.toThrow(/no terminó bien.*error/);
    expect(context.state.productionUrl).toBeUndefined();
  });

  it("falla si readyState no es READY", async () => {
    const stdout = salidaJson({ deployment: { readyState: "ERROR" } });
    const context = makeContext({ runner: new FakeRunner(() => ({ stdout })) });
    await expect(new DeployStep().run(context)).rejects.toThrow(/no terminó bien.*ERROR/);
    expect(context.state.productionUrl).toBeUndefined();
  });

  it("falla si la salida JSON no trae ninguna URL", async () => {
    const stdout = JSON.stringify({ status: "ok", deployment: { readyState: "READY" } });
    const context = makeContext({ runner: new FakeRunner(() => ({ stdout })) });
    await expect(new DeployStep().run(context)).rejects.toThrow(/URL/);
  });

  it("sin JSON, prefiere la línea Aliased a la URL del despliegue", async () => {
    const stdout = [
      "Inspect: https://vercel.com/x/y",
      "Production: https://kuorum-x-abc.vercel.app [12s]",
      "Aliased: https://kuorum-x.vercel.app [12s]",
      "",
    ].join("\n");
    const context = makeContext({ runner: new FakeRunner(() => ({ stdout })) });
    await new DeployStep().run(context);
    expect(context.state.productionUrl).toBe("https://kuorum-x.vercel.app");
  });

  it("sin JSON ni Aliased, extrae la última línea https:// de la salida", async () => {
    const runner = new FakeRunner(() => ({
      stdout: "Inspect: https://vercel.com/x/y\nBuilding...\nhttps://kuorum-x.vercel.app\n",
    }));
    const context = makeContext({ runner });
    await new DeployStep().run(context);
    expect(context.state.productionUrl).toBe("https://kuorum-x.vercel.app");
  });

  it("falla con la salida de error si el despliegue sale con código distinto de 0", async () => {
    const runner = new FakeRunner(() => ({ exitCode: 1, stderr: "Build failed" }));
    await expect(new DeployStep().run(makeContext({ runner }))).rejects.toThrow(/Build failed/);
  });

  it("falla si no hay ninguna URL en la salida de texto", async () => {
    const runner = new FakeRunner(() => ({ stdout: "nada útil\n" }));
    await expect(new DeployStep().run(makeContext({ runner }))).rejects.toThrow(/URL/);
  });
});
