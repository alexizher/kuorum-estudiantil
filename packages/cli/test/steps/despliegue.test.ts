import { describe, expect, it } from "vitest";
import { DeployStep } from "../../src/steps/deploy-step.js";
import { FakeRunner, makeContext } from "../doubles.js";

describe("despliegue", () => {
  it("extrae la última línea https:// de la salida", async () => {
    const runner = new FakeRunner(() => ({
      stdout: "Inspect: https://vercel.com/x/y\nBuilding...\nhttps://kuorum-x.vercel.app\n",
    }));
    const context = makeContext({ runner });
    await new DeployStep().run(context);
    expect(runner.lines).toEqual(["vercel deploy --prod --yes"]);
    expect(context.state.productionUrl).toBe("https://kuorum-x.vercel.app");
  });

  it("falla con la salida de error si el despliegue sale con código distinto de 0", async () => {
    const runner = new FakeRunner(() => ({ exitCode: 1, stderr: "Build failed" }));
    await expect(new DeployStep().run(makeContext({ runner }))).rejects.toThrow(/Build failed/);
  });

  it("falla si no hay ninguna URL en la salida", async () => {
    const runner = new FakeRunner(() => ({ stdout: "nada útil\n" }));
    await expect(new DeployStep().run(makeContext({ runner }))).rejects.toThrow(/URL/);
  });
});
