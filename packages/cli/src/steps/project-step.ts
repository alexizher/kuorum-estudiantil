import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { DeployContext, Step } from "../wizard/step.js";
import type { TokenReader } from "./vercel-token.js";

export class ProjectStep implements Step {
  readonly id = "proyecto";
  readonly description = "Creando y enlazando el proyecto en Vercel";

  constructor(private readonly token: TokenReader) {}

  async run({ config, state, runner, prompter, fetch, cwd }: DeployContext): Promise<void> {
    if (state.projectId) return;
    const name = config.shortName;

    const created = await runner.run("vercel", ["project", "create", name]);
    if (created.exitCode !== 0 && !/already exists/i.test(created.stdout + created.stderr)) {
      throw new Error(`No se pudo crear el proyecto: ${created.stderr.trim()}`);
    }
    const linked = await runner.run("vercel", ["link", "--yes", "--project", name]);
    if (linked.exitCode !== 0) {
      throw new Error(`No se pudo enlazar el proyecto: ${linked.stderr.trim()}`);
    }

    const link = await readLink(cwd);
    await this.fixRootDirectory(fetch, link);

    const remote = await runner.run("git", ["remote", "get-url", "origin"]);
    if (remote.exitCode === 0 && remote.stdout.includes("github.com")) {
      const connected = await runner.run("vercel", ["git", "connect", "--yes"]);
      if (connected.exitCode !== 0) {
        prompter.info(
          "No se pudo conectar el repositorio de GitHub; conéctalo desde el panel de Vercel si quieres despliegues por push.",
        );
      }
    }
    state.projectId = link.projectId;
  }

  private async fixRootDirectory(
    fetchFn: typeof fetch,
    link: { projectId: string; orgId?: string },
  ): Promise<void> {
    const token = await this.token.read();
    if (!token) {
      throw new Error(
        "No se encontró el token de Vercel. Define VERCEL_TOKEN o inicia sesión con la CLI.",
      );
    }
    const team = link.orgId?.startsWith("team_") ? `?teamId=${link.orgId}` : "";
    const response = await fetchFn(`https://api.vercel.com/v9/projects/${link.projectId}${team}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ rootDirectory: "apps/web", framework: "nextjs" }),
    });
    if (!response.ok) {
      throw new Error(
        `Vercel rechazó fijar el directorio raíz del proyecto (HTTP ${response.status}).`,
      );
    }
  }
}

async function readLink(cwd: string): Promise<{ projectId: string; orgId?: string }> {
  let raw: { projectId?: unknown; orgId?: unknown };
  try {
    raw = JSON.parse(await readFile(join(cwd, ".vercel", "project.json"), "utf8")) as typeof raw;
  } catch {
    throw new Error("No se pudo leer .vercel/project.json después de enlazar el proyecto.");
  }
  if (typeof raw.projectId !== "string") {
    throw new Error(".vercel/project.json no tiene projectId.");
  }
  return typeof raw.orgId === "string"
    ? { projectId: raw.projectId, orgId: raw.orgId }
    : { projectId: raw.projectId };
}
