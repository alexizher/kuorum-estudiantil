import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/composition.js", () => ({
  buildDeployWizard: () => {
    throw new Error("fallo inesperado al armar el asistente");
  },
  buildPublishWizard: () => {
    throw new Error("no se usa");
  },
}));

const argvOriginal = process.argv;
afterEach(() => {
  process.argv = argvOriginal;
  vi.restoreAllMocks();
});

describe("index", () => {
  it("si main() lanza, escribe el mensaje en stderr y sale con código 1", async () => {
    process.argv = ["node", "kuorum", "desplegar"];
    const exit = vi.spyOn(process, "exit").mockImplementation((() => undefined) as never);
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    await import("../src/index.js");

    expect(exit).toHaveBeenCalledWith(1);
    expect(stderr).toHaveBeenCalledWith("fallo inesperado al armar el asistente\n");
  });
});
