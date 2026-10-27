import type { DeployContext, Step } from "../wizard/step.js";
import { isGitHubRemote } from "./github-remote.js";

const LOGIN_HINT =
  " Conecta GitHub en Vercel (Account Settings > Authentication > Login Connections) y vuelve a conectar el repositorio desde el panel del proyecto. Mientras tanto, los despliegues siguen funcionando con pnpm desplegar.";
const GENERIC_HINT =
  " Conéctalo desde el panel de Vercel si quieres despliegues por push; los despliegues con pnpm desplegar siguen funcionando.";

/** Si falla, avisa y sigue: los despliegues con pnpm desplegar no dependen de esta conexión. */
export class GitConnectStep implements Step {
  readonly id = "conectar-repositorio";
  readonly description = "Conectando el proyecto al repositorio, si el remoto origin es de GitHub";

  async run({ runner, prompter }: DeployContext): Promise<void> {
    const remote = await runner.run("git", ["remote", "get-url", "origin"]);
    if (remote.exitCode !== 0 || !isGitHubRemote(remote.stdout)) return;
    const connected = await runner.run("vercel", ["git", "connect", "--yes"]);
    if (connected.exitCode === 0) return;
    const detail = errorLine(connected.stderr + connected.stdout);
    const hint = /Login Connection/i.test(detail) ? LOGIN_HINT : GENERIC_HINT;
    prompter.info(`No se pudo conectar el repositorio de GitHub (${detail}).${hint}`);
  }
}

function errorLine(output: string): string {
  const lines = output.split("\n").map((line) => line.trim());
  return lines.find((line) => /^error/i.test(line)) ?? lines.find(Boolean) ?? "sin detalle";
}
