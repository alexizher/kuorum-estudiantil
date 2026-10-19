import { describe, expect, it } from "vitest";
import { SpawnCommandRunner } from "../src/io/command-runner.js";

describe("SpawnCommandRunner", () => {
  it("devuelve stdout y código de salida", async () => {
    const result = await new SpawnCommandRunner().run(process.execPath, [
      "-e",
      "console.log('hola')",
    ]);
    expect(result).toEqual({ exitCode: 0, stdout: "hola\n", stderr: "" });
  });

  it("pasa input por stdin", async () => {
    const result = await new SpawnCommandRunner().run(
      process.execPath,
      ["-e", "process.stdin.pipe(process.stdout)"],
      { input: "valor" },
    );
    expect(result.stdout).toBe("valor");
  });

  it("no revienta con EPIPE si el proceso termina sin leer stdin", async () => {
    const result = await new SpawnCommandRunner().run(process.execPath, ["-e", "process.exit(3)"], {
      input: "x".repeat(5_000_000),
    });
    expect(result.exitCode).toBe(3);
  });
});
