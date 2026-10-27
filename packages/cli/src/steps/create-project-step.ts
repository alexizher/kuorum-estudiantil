import type { DeployConfig } from "../config/deploy-config.js";
import type { DeployContext, Step } from "../wizard/step.js";

export class CreateProjectStep implements Step {
  readonly id = "crear-proyecto";
  readonly description = (config: DeployConfig) =>
    `Creando el proyecto "${config.shortName}" en tu cuenta de Vercel`;

  async run({ config, state, runner, prompter, interactive }: DeployContext): Promise<void> {
    if (state.projectId) return;
    const name = config.shortName;
    const created = await runner.run("vercel", ["project", "create", name]);
    if (created.exitCode === 0) return;
    if (!/already exists/i.test(created.stdout + created.stderr)) {
      throw new Error(`No se pudo crear el proyecto: ${created.stderr.trim()}`);
    }
    await confirmReuse(name, config.reuseExistingProject === true, interactive, prompter);
  }
}

async function confirmReuse(
  name: string,
  allowed: boolean,
  interactive: boolean,
  prompter: DeployContext["prompter"],
): Promise<void> {
  if (allowed) return;
  if (!interactive) {
    throw new Error(
      `Ya existe un proyecto "${name}" en tu cuenta de Vercel y el asistente cambiaría su directorio raíz y su repositorio. ` +
        `Elige otro shortName o agrega "reuseExistingProject": true a la configuración si quieres usarlo.`,
    );
  }
  const accepted = await prompter.confirm(
    `Ya existe un proyecto "${name}" en tu cuenta de Vercel. Si lo usas, el asistente cambiará su directorio raíz a apps/web y lo conectará a este repositorio. ¿Usarlo?`,
  );
  if (!accepted) {
    throw new Error(
      `No se tocó el proyecto "${name}". Elige otro nombre corto y vuelve a correr el asistente.`,
    );
  }
}
