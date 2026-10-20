import { describe, expect, it } from "vitest";
import { VariablesStep } from "../../src/steps/variables-step.js";
import { FakeRunner, makeContext } from "../doubles.js";

describe("variables", () => {
  it("pasa el valor por input y nunca en args, en production y preview", async () => {
    const runner = new FakeRunner();
    await new VariablesStep().run(makeContext({ runner }));
    const adds = runner.calls.filter((c) => c.args[0] === "env" && c.args[1] === "add");
    expect(adds.map((c) => c.args[3])).toEqual(["production", "preview"]);
    for (const call of adds) {
      expect(call.args[2]).toBe("KUORUM_INSTITUCION_NOMBRE");
      expect(call.options?.input).toBe("Universidad del Ejemplo");
      expect(call.args.join(" ")).not.toContain("Universidad del Ejemplo");
    }
  });

  it("si la variable ya existe, la quita y la vuelve a agregar", async () => {
    let first = true;
    const runner = new FakeRunner((_, args) => {
      if (args[1] === "add" && first) {
        first = false;
        return { exitCode: 1, stderr: "already exists" };
      }
      return undefined;
    });
    await new VariablesStep().run(makeContext({ runner }));
    expect(runner.lines.slice(0, 3)).toEqual([
      "vercel env add KUORUM_INSTITUCION_NOMBRE production",
      "vercel env rm KUORUM_INSTITUCION_NOMBRE production --yes",
      "vercel env add KUORUM_INSTITUCION_NOMBRE production",
    ]);
  });

  it("falla si agregar sigue fallando por otra causa", async () => {
    const runner = new FakeRunner((_, args) =>
      args[1] === "add" ? { exitCode: 1, stderr: "boom" } : undefined,
    );
    await expect(new VariablesStep().run(makeContext({ runner }))).rejects.toThrow(/boom/);
  });
});
