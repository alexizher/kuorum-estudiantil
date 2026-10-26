import type { CommandResult, CommandRunner } from "../io/command-runner.js";
import type { DeployContext, Step } from "../wizard/step.js";

const MIN_NODE_MAJOR = 22;

export class RequirementsStep implements Step {
  readonly id = "requisitos";
  readonly description = "Comprobando requisitos (node, pnpm, git, vercel)";

  async run({ runner, prompter, interactive }: DeployContext): Promise<void> {
    const node = await tryRun(runner, "node", ["--version"]);
    const major = Number(/^v(\d+)\./.exec(node?.stdout.trim() ?? "")?.[1]);
    if (node?.exitCode !== 0 || !(major >= MIN_NODE_MAJOR)) {
      throw new Error(`Se necesita Node ${MIN_NODE_MAJOR} o superior.`);
    }
    for (const tool of ["pnpm", "git"]) {
      if ((await tryRun(runner, tool, ["--version"]))?.exitCode !== 0) {
        throw new Error(`No se encontró "${tool}". Instálalo y vuelve a correr el asistente.`);
      }
    }
    if ((await tryRun(runner, "vercel", ["--version"]))?.exitCode === 0) return;

    if (!interactive) {
      throw new Error(
        'No se encontró la CLI de Vercel. Instálala con "pnpm add -g vercel@64" y vuelve a correr pnpm desplegar.',
      );
    }
    const install = await prompter.confirm(
      "No se encontró la CLI de Vercel. ¿Instalarla con pnpm add -g vercel@64?",
    );
    if (!install) throw new Error('Se necesita la CLI "vercel" para continuar.');
    const result = await runner.run("pnpm", ["add", "-g", "vercel@64"]);
    if (result.exitCode !== 0) {
      throw new Error(`No se pudo instalar vercel: ${result.stderr.trim() || "error desconocido"}`);
    }
    if ((await tryRun(runner, "vercel", ["--version"]))?.exitCode !== 0) {
      throw new Error(await pathHint(runner));
    }
  }
}

/** pnpm instala los binarios globales en un directorio que puede no estar en el PATH. */
async function pathHint(runner: CommandRunner): Promise<string> {
  const bin = await tryRun(runner, "pnpm", ["bin", "-g"]);
  const dir = bin?.exitCode === 0 ? bin.stdout.trim() : "";
  const where = dir ? `el directorio ${dir}` : 'el directorio que muestra "pnpm bin -g"';
  return (
    'Se instaló la CLI de Vercel, pero el comando "vercel" no aparece en el PATH. ' +
    `Agrega ${where} a tu PATH (o corre "pnpm setup" y abre una terminal nueva) y vuelve a correr pnpm desplegar.`
  );
}

async function tryRun(
  runner: CommandRunner,
  command: string,
  args: string[],
): Promise<CommandResult | undefined> {
  try {
    return await runner.run(command, args);
  } catch {
    return undefined; // el binario no existe (ENOENT)
  }
}
