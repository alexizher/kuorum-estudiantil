import type { DeployConfig } from "../config/deploy-config.js";
import type { CommandResult, CommandRunner } from "../io/command-runner.js";
import type { DeployContext, Step } from "../wizard/step.js";
import { existingAgentFiles, removeNewAgentFiles } from "./agent-files.js";

const NEON_FREE_PLAN = "free_v3";
const NEON_PAGE = "https://vercel.com/marketplace/neon";
const REQUIRED_VARIABLES = ["DATABASE_URL", "DATABASE_URL_UNPOOLED"];

type PendingTerms = { url: string; policyLinks: [string, string][] };

function addArgs(name: string): string[] {
  return [
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
    "--non-interactive",
  ];
}

/**
 * Sin TTY la CLI imprime un JSON en stdout cuando falta una acción de la persona.
 * Puede venir después de otras líneas: se lee desde la primera línea que abre un objeto.
 */
function pendingTerms(stdout: string): PendingTerms | undefined {
  const start = stdout.search(/^\s*\{/m);
  if (start < 0) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout.slice(start, stdout.lastIndexOf("}") + 1));
  } catch {
    return undefined;
  }
  if (typeof parsed !== "object" || parsed === null) return undefined;
  const body = parsed as {
    userActionRequired?: unknown;
    verification_uri?: unknown;
    policy_links?: unknown;
  };
  if (body.userActionRequired !== true || typeof body.verification_uri !== "string") {
    return undefined;
  }
  const links =
    typeof body.policy_links === "object" && body.policy_links !== null
      ? Object.entries(body.policy_links).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        )
      : [];
  return { url: body.verification_uri, policyLinks: links };
}

export class DatabaseStep implements Step {
  readonly id = "base-de-datos";
  readonly description = (config: DeployConfig) =>
    `Creando en tu cuenta el recurso de Neon "${config.shortName}-db" (plan gratuito) y conectándolo al proyecto en production, preview y development`;

  async run({ config, state, runner, prompter, interactive, cwd }: DeployContext): Promise<void> {
    if (state.databaseName) return;
    const name = `${config.shortName}-db`;

    // Un paso anterior pudo crear la base y fallar después: no se crea otra.
    if ((await this.missingVariables(runner)).length === 0) {
      state.databaseName = name;
      return;
    }

    const before = await existingAgentFiles(cwd);
    let added: CommandResult;
    try {
      added = await this.addIntegration(name, runner, prompter, interactive);
    } finally {
      await removeNewAgentFiles(cwd, before);
    }
    if (added.exitCode !== 0 || pendingTerms(added.stdout)) {
      const detail = added.stderr.trim() || "sin detalle";
      if (!interactive) {
        throw new Error(
          `La CLI no pudo crear la base sola (${detail}). Créala a mano en ${NEON_PAGE}: nombre "${name}", plan gratuito, ` +
            `conectada a este proyecto en production, preview y development, y vuelve a correr pnpm desplegar.`,
        );
      }
      prompter.info(
        `La CLI no pudo crear la base sola (${detail}). ` +
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

  /** Si Neon pide aceptar sus términos, espera a que la persona los acepte y reintenta una vez. */
  private async addIntegration(
    name: string,
    runner: CommandRunner,
    prompter: DeployContext["prompter"],
    interactive: boolean,
  ): Promise<CommandResult> {
    const added = await runner.run("vercel", addArgs(name));
    const terms = pendingTerms(added.stdout);
    if (!terms) return added;
    await this.acceptTerms(terms, interactive, prompter);
    return runner.run("vercel", addArgs(name));
  }

  /** Vuelve cuando la persona dice que aceptó; si no, o sin interacción, falla con la URL. */
  private async acceptTerms(
    terms: PendingTerms,
    interactive: boolean,
    prompter: DeployContext["prompter"],
  ): Promise<void> {
    const links = terms.policyLinks.map(([name, url]) => `\n  ${name}: ${url}`).join("");
    if (!interactive) {
      throw new Error(
        `Neon pide aceptar sus términos una vez por cuenta. Ábrelos en ${terms.url}${links} y acéptalos; ` +
          `luego vuelve a correr pnpm desplegar (el asistente retoma donde quedó).`,
      );
    }
    prompter.info(
      `Neon pide aceptar sus términos una vez por cuenta. Ábrelos en ${terms.url}${links}`,
    );
    if (!(await prompter.confirm("¿Ya aceptaste los términos?"))) {
      throw new Error(
        "Faltan por aceptar los términos de Neon; acéptalos y vuelve a correr pnpm desplegar.",
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
