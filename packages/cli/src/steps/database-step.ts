import type { DeployContext, Step } from "../wizard/step.js";

const NEON_FREE_PLAN = "free_v3";
const NEON_PAGE = "https://vercel.com/marketplace/neon";
const REQUIRED_VARIABLES = ["DATABASE_URL", "DATABASE_URL_UNPOOLED"];

export class DatabaseStep implements Step {
  readonly id = "base-de-datos";
  readonly description = "Creando la base de datos Neon";

  async run({ config, state, runner, prompter }: DeployContext): Promise<void> {
    if (state.databaseName) return;
    const name = `${config.shortName}-db`;

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

    const listed = await runner.run("vercel", ["env", "ls"]);
    const missing = REQUIRED_VARIABLES.filter(
      (variable) => !new RegExp(`\\b${variable}\\b`).test(listed.stdout),
    );
    if (missing.length > 0) {
      throw new Error(
        `El proyecto no tiene la variable ${missing.join(" ni ")} de la base de datos.`,
      );
    }
    state.databaseName = name;
  }
}
