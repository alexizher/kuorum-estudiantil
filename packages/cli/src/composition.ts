import { homedir } from "node:os";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { FileConfigSource, InteractiveConfigSource } from "./config/config-source.js";
import { SpawnCommandRunner } from "./io/command-runner.js";
import { ClackPrompter } from "./io/prompter.js";
import { DatabaseStep } from "./steps/database-step.js";
import { DeployStep } from "./steps/deploy-step.js";
import { ProjectStep } from "./steps/project-step.js";
import { RequirementsStep } from "./steps/requirements-step.js";
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
    new DeployStep(),
    new VerificationStep(),
    new SummaryStep(),
  ];
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
