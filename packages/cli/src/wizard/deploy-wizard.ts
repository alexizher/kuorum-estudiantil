import type { ConfigSource } from "../config/config-source.js";
import { InvalidConfigError, MissingConfigError } from "../config/deploy-config.js";
import type { CommandRunner } from "../io/command-runner.js";
import type { Prompter } from "../io/prompter.js";
import type { StateRepository } from "./state-store.js";
import type { DeployContext, DeployState, Step } from "./step.js";

export type WizardEnvironment = Pick<DeployContext, "fetch" | "sleep" | "cwd">;

export class DeployWizard {
  constructor(
    private readonly steps: Step[],
    private readonly store: StateRepository,
    private readonly configSource: ConfigSource,
    private readonly prompter: Prompter,
    private readonly runner: CommandRunner,
    private readonly environment: WizardEnvironment,
  ) {}

  async run(): Promise<number> {
    const state = await this.store.load();
    const config = await this.resolveConfig(state);
    if (!config) return 1;
    state.config = config;
    await this.store.save(state);

    const context: DeployContext = {
      config,
      state,
      runner: this.runner,
      prompter: this.prompter,
      ...this.environment,
    };

    for (const step of this.steps) {
      if (state.completedSteps.includes(step.id)) continue;
      this.prompter.info(step.description);
      try {
        await step.run(context);
      } catch (error) {
        this.prompter.fail(error instanceof Error ? error.message : String(error));
        await this.store.save(state);
        return 1;
      }
      state.completedSteps.push(step.id);
      await this.store.save(state);
    }
    return 0;
  }

  private async resolveConfig(state: DeployState) {
    if (state.config) return state.config;
    try {
      return await this.configSource.load();
    } catch (error) {
      if (error instanceof MissingConfigError || error instanceof InvalidConfigError) {
        this.prompter.fail(error.message);
      } else {
        this.prompter.fail(error instanceof Error ? error.message : String(error));
      }
      return undefined;
    }
  }
}
