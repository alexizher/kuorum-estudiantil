import type { CommandRunner } from "../io/command-runner.js";
import type { DeployContext, Step } from "../wizard/step.js";

const VARIABLE = "KUORUM_INSTITUCION_NOMBRE";
const ENVIRONMENTS = ["production", "preview"];

export class VariablesStep implements Step {
  readonly id = "variables";
  readonly description =
    "Cargando KUORUM_INSTITUCION_NOMBRE como variable de entorno del proyecto en production y preview";

  async run({ config, runner }: DeployContext): Promise<void> {
    for (const environment of ENVIRONMENTS) {
      await this.set(runner, environment, config.institutionName);
    }
  }

  private async set(runner: CommandRunner, environment: string, value: string): Promise<void> {
    const add = () => runner.run("vercel", ["env", "add", VARIABLE, environment], { input: value });
    let result = await add();
    if (result.exitCode !== 0 && /already exists/i.test(result.stdout + result.stderr)) {
      await runner.run("vercel", ["env", "rm", VARIABLE, environment, "--yes"]);
      result = await add();
    }
    if (result.exitCode !== 0) {
      throw new Error(`No se pudo cargar ${VARIABLE} en ${environment}: ${result.stderr.trim()}`);
    }
  }
}
