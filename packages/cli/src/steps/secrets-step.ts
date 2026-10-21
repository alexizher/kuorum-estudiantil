import { randomBytes } from "node:crypto";
import type { CommandRunner } from "../io/command-runner.js";
import type { DeployContext, Step } from "../wizard/step.js";

const SECRETS = ["KUORUM_SECRETO", "BETTER_AUTH_SECRET"];
const ENVIRONMENTS = ["production", "preview"];

export class SecretsStep implements Step {
  readonly id = "secretos";

  /** Dentro de `pnpm publicar` el build que sigue ya toma los secretos: no hay que sugerirlo. */
  constructor(private readonly options: { sugerirPublicar?: boolean } = {}) {}

  get sugerirPublicar(): boolean {
    return this.options.sugerirPublicar ?? true;
  }

  readonly description =
    "Generando KUORUM_SECRETO y BETTER_AUTH_SECRET en production y preview (solo los que falten)";

  async run({ runner, state, prompter }: DeployContext): Promise<void> {
    for (const environment of ENVIRONMENTS) {
      const listed = await runner.run("vercel", ["env", "ls", environment]);
      if (listed.exitCode !== 0) {
        throw new Error(
          `No se pudo leer las variables de ${environment}: ${listed.stderr.trim().split("\n")[0] ?? ""}`,
        );
      }
      for (const name of SECRETS) {
        if (new RegExp(`\\b${name}\\b`).test(listed.stdout)) continue;
        await this.add(runner, name, environment);
      }
    }
    if (this.sugerirPublicar && state.completedSteps.includes("despliegue")) {
      prompter.info(
        "Los secretos nuevos se aplican en el próximo despliegue: corre pnpm publicar.",
      );
    }
  }

  // El valor viaja solo por stdin: nunca en argumentos, estado ni mensajes.
  private async add(runner: CommandRunner, name: string, environment: string): Promise<void> {
    const value = randomBytes(32).toString("hex");
    const result = await runner.run("vercel", ["env", "add", name, environment], { input: value });
    if (result.exitCode !== 0) {
      throw new Error(`No se pudo cargar ${name} en ${environment}: ${result.stderr.trim()}`);
    }
  }
}
