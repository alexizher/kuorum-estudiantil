import type { DeployContext, Step } from "../wizard/step.js";
import type { TokenReader } from "./vercel-token.js";
import { readLink } from "./vercel-link.js";

export class RootDirectoryStep implements Step {
  readonly id = "directorio-raiz";
  readonly description =
    "Fijando apps/web como directorio raíz del proyecto, con el framework Next.js";

  constructor(private readonly token: TokenReader) {}

  async run({ fetch, cwd }: DeployContext): Promise<void> {
    const link = await readLink(cwd);
    const token = await this.token.read();
    if (!token) {
      throw new Error(
        "No se encontró el token de Vercel. Define VERCEL_TOKEN o inicia sesión con la CLI.",
      );
    }
    const team = link.orgId?.startsWith("team_") ? `?teamId=${link.orgId}` : "";
    const response = await fetch(`https://api.vercel.com/v9/projects/${link.projectId}${team}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        rootDirectory: "apps/web",
        framework: "nextjs",
        sourceFilesOutsideRootDirectory: true,
      }),
    });
    if (!response.ok) {
      throw new Error(
        `Vercel rechazó fijar el directorio raíz del proyecto (HTTP ${response.status}).`,
      );
    }
  }
}
