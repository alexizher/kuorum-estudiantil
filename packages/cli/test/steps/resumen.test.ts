import { describe, expect, it } from "vitest";
import { SummaryStep } from "../../src/steps/summary-step.js";
import { FakePrompter, makeContext } from "../doubles.js";

describe("resumen", () => {
  it("muestra la URL y el enlace a la guía", async () => {
    const prompter = new FakePrompter();
    await new SummaryStep().run(
      makeContext({
        prompter,
        state: { completedSteps: [], productionUrl: "https://kuorum-x.vercel.app" },
      }),
    );
    const text = prompter.successes.concat(prompter.infos).join("\n");
    expect(text).toContain("https://kuorum-x.vercel.app");
    expect(text).toContain("docs/despliegue.md");
  });
});
