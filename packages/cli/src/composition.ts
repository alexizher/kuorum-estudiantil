import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { FileConfigSource, InteractiveConfigSource } from "./config/config-source.js";
import { SpawnCommandRunner } from "./io/command-runner.js";
import { ClackPrompter } from "./io/prompter.js";
import { DeployWizard } from "./wizard/deploy-wizard.js";
import { StateStore } from "./wizard/state-store.js";
import type { Step } from "./wizard/step.js";

export function buildDeployWizard(options: { configPath?: string; cwd: string }): DeployWizard {
  const prompter = new ClackPrompter();
  const steps: Step[] = [];
  const configSource = options.configPath
    ? new FileConfigSource(resolve(options.cwd, options.configPath))
    : new InteractiveConfigSource(prompter);
  return new DeployWizard(
    steps,
    new StateStore(resolve(options.cwd, ".kuorum/despliegue.json")),
    configSource,
    prompter,
    new SpawnCommandRunner(),
    { fetch, sleep: (ms) => delay(ms), cwd: options.cwd },
  );
}
