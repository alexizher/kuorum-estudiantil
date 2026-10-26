import type { DeployConfig } from "../config/deploy-config.js";
import type { DeployContext, Step } from "../wizard/step.js";
import { readLink } from "./vercel-link.js";

export class LinkProjectStep implements Step {
  readonly id = "enlazar-proyecto";
  readonly description = (config: DeployConfig) =>
    `Enlazando esta carpeta al proyecto "${config.shortName}"`;

  async run({ config, state, runner, cwd }: DeployContext): Promise<void> {
    if (state.projectId) return;
    const linked = await runner.run("vercel", ["link", "--yes", "--project", config.shortName]);
    if (linked.exitCode !== 0) {
      throw new Error(`No se pudo enlazar el proyecto: ${linked.stderr.trim()}`);
    }
    state.projectId = (await readLink(cwd)).projectId;
  }
}
