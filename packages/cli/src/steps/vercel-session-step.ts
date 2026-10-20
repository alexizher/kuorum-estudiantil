import type { DeployContext, Step } from "../wizard/step.js";

export class VercelSessionStep implements Step {
  readonly id = "sesion-vercel";
  readonly description = "Comprobando la sesión de Vercel";

  async run({ runner }: DeployContext): Promise<void> {
    if ((await runner.run("vercel", ["whoami"])).exitCode === 0) return;
    const login = await runner.run("vercel", ["login"], { inheritStdio: true });
    if (login.exitCode !== 0) throw new Error("No se pudo iniciar sesión en Vercel.");
  }
}
