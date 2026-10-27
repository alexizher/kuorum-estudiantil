import { z } from "zod";
import { DeployConfigSchema, type DeployConfig } from "../config/deploy-config.js";
import type { CommandRunner } from "../io/command-runner.js";
import type { Prompter } from "../io/prompter.js";

export const DeployStateSchema = z.object({
  completedSteps: z.array(z.string()),
  projectId: z.string().optional(),
  productionUrl: z.string().optional(),
  databaseName: z.string().optional(),
  config: DeployConfigSchema.optional(),
});

export type DeployState = z.infer<typeof DeployStateSchema>;

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

/** "omitido" deja el paso pendiente para la próxima corrida. */
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export type ResultadoDePaso = void | "omitido";

export interface Step {
  readonly id: string;
  readonly description: string | ((config: DeployConfig) => string);
  run(context: DeployContext): Promise<ResultadoDePaso>;
}
