import type { DeployContext, Step } from "../wizard/step.js";

export class DeployStep implements Step {
  readonly id = "despliegue";
  readonly description = "Desplegando a producción (puede tardar unos minutos)";

  async run({ runner, state }: DeployContext): Promise<void> {
    const result = await runner.run("vercel", ["deploy", "--prod", "--yes"]);
    if (result.exitCode !== 0) {
      throw new Error(`El despliegue falló: ${result.stderr.trim() || result.stdout.trim()}`);
    }
    const url = result.stdout
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("https://"))
      .at(-1);
    if (!url) throw new Error("El despliegue terminó pero no se encontró la URL en la salida.");
    state.productionUrl = url;
  }
}
