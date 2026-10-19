import type { DeployConfig } from "../config/deploy-config.js";
import type { CommandRunner } from "../io/command-runner.js";
import type { DeployContext, Step } from "../wizard/step.js";

const NEON_FREE_PLAN = "free_v3";
const NEON_PAGE = "https://vercel.com/marketplace/neon";
const REQUIRED_VARIABLES = ["DATABASE_URL", "DATABASE_URL_UNPOOLED"];

export class DatabaseStep implements Step {
  readonly id = "base-de-datos";
  readonly description = (config: DeployConfig) =>
    `Creando en tu cuenta el recurso de Neon "${config.shortName}-db" (plan gratuito) y conectándolo al proyecto en production, preview y development`;

  async run({ config, state, runner, prompter }: DeployContext): Promise<void> {
    if (state.databaseName) return;
    const name = `${config.shortName}-db`;

    // Un paso anterior pudo crear la base y fallar después: no se crea otra.
    if ((await this.missingVariables(runner)).length === 0) {
      state.databaseName = name;
      return;
    }

    const added = await runner.run("vercel", [
      "integration",
      "add",
      "neon",
      "--name",
      name,
      "--plan",
      NEON_FREE_PLAN,
      "--environment",
      "production",
      "--environment",
      "preview",
      "--environment",
      "development",
      "--no-env-pull",
    ]);
    if (added.exitCode !== 0) {
      prompter.info(
        `La CLI no pudo crear la base sola (${added.stderr.trim() || "sin detalle"}). ` +
          `Créala a mano en ${NEON_PAGE}: nombre "${name}", plan gratuito, conectada a este proyecto en production, preview y development.`,
      );
      const done = await prompter.confirm(
        "¿Ya creaste la base de datos y la conectaste al proyecto?",
      );
      if (!done)
        throw new Error("Falta crear la base de datos en Neon; vuelve a correr el asistente.");
    }

    state.databaseName = name; // ya existe: si la verificación falla, al reanudar no se duplica
    const missing = await this.missingVariables(runner);
    if (missing.length > 0) {
      throw new Error(
        `El proyecto no tiene la variable ${missing.join(" ni ")} de la base de datos.`,
      );
    }
  }

  private async missingVariables(runner: CommandRunner): Promise<string[]> {
    const listed = await runner.run("vercel", ["env", "ls", "production"]);
    return REQUIRED_VARIABLES.filter(
      (variable) => !new RegExp(`\\b${variable}\\b`).test(listed.stdout),
    );
  }
}
