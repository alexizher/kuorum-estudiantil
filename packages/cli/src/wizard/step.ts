import type { DeployConfig } from "../config/deploy-config.js";
import type { CommandRunner } from "../io/command-runner.js";
import type { Prompter } from "../io/prompter.js";

export type DeployState = {
  completedSteps: string[];
  projectId?: string;
  productionUrl?: string;
  databaseName?: string;
  config?: DeployConfig;
};

export type DeployContext = {
  config: DeployConfig;
  state: DeployState;
  runner: CommandRunner;
  prompter: Prompter;
  fetch: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  cwd: string;
  /** Falso con --config: no hay nadie para responder confirmaciones. */
  interactive: boolean;
};

export interface Step {
  readonly id: string;
  readonly description: string | ((config: DeployConfig) => string);
  run(context: DeployContext): Promise<void>;
}
