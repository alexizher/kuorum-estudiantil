import { homedir } from "node:os";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import {
  FileConfigSource,
  InteractiveConfigSource,
  type ConfigSource,
} from "./config/config-source.js";
import { SpawnCommandRunner } from "./io/command-runner.js";
import { ClackPrompter } from "./io/prompter.js";
import { AdminStep } from "./steps/admin-step.js";
import { DatabaseStep } from "./steps/database-step.js";
import { DeployStep } from "./steps/deploy-step.js";
import { ProjectStep } from "./steps/project-step.js";
import { RequirementsStep } from "./steps/requirements-step.js";
import { SecretsStep } from "./steps/secrets-step.js";
import { SummaryStep } from "./steps/summary-step.js";
import { VariablesStep } from "./steps/variables-step.js";
import { VercelSessionStep } from "./steps/vercel-session-step.js";
import { VercelTokenReader, type TokenReader } from "./steps/vercel-token.js";
import { VerificationStep } from "./steps/verification-step.js";
import { DeployWizard } from "./wizard/deploy-wizard.js";
import { StateStore } from "./wizard/state-store.js";
import type { Step } from "./wizard/step.js";

export function buildSteps(token: TokenReader): Step[] {
  return [
    new RequirementsStep(),
    new VercelSessionStep(),
    new ProjectStep(token),
    new DatabaseStep(),
    new VariablesStep(),
    new SecretsStep(),
    new DeployStep(),
    new VerificationStep(),
    new AdminStep(),
    new SummaryStep(),
  ];
}

export function buildPublishWizard(options: { cwd: string }): DeployWizard {
  const prompter = new ClackPrompter();
  const sinInstalacion: ConfigSource = {
    load: async () => {
      throw new Error(
        "No hay una instalación creada en este directorio. Corre primero pnpm desplegar.",
      );
    },
  };
  return new DeployWizard(
    [new DeployStep(), new VerificationStep()],
    new StateStore(resolve(options.cwd, ".kuorum/despliegue.json")),
    sinInstalacion,
    prompter,
    new SpawnCommandRunner(),
    { fetch, sleep: (ms) => delay(ms), cwd: options.cwd, interactive: true },
    { repetirPasos: true },
  );
}

export function buildDeployWizard(options: { configPath?: string; cwd: string }): DeployWizard {
  const prompter = new ClackPrompter();
  const steps = buildSteps(new VercelTokenReader(process.env, process.platform, homedir()));
  const configSource = options.configPath
    ? new FileConfigSource(resolve(options.cwd, options.configPath))
    : new InteractiveConfigSource(prompter);
  return new DeployWizard(
    steps,
    new StateStore(resolve(options.cwd, ".kuorum/despliegue.json")),
    configSource,
    prompter,
    new SpawnCommandRunner(),
    {
      fetch,
      sleep: (ms) => delay(ms),
      cwd: options.cwd,
      interactive: options.configPath === undefined,
    },
  );
}
