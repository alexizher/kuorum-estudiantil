import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { DeployConfig } from "../config/deploy-config.js";
import type { DeployContext, Step } from "../wizard/step.js";
import type { TokenReader } from "./vercel-token.js";

export class ProjectStep implements Step {
  readonly id = "proyecto";
  readonly description = (config: DeployConfig) =>
    `Creando el proyecto "${config.shortName}" en tu cuenta de Vercel, enlazándolo a esta carpeta y, si el remoto es de GitHub, conectándolo al repositorio`;

  constructor(private readonly token: TokenReader) {}

  async run({
    config,
    state,
    runner,
    prompter,
    fetch,
    cwd,
    interactive,
  }: DeployContext): Promise<void> {
    if (state.projectId) return;
    const name = config.shortName;

    const created = await runner.run("vercel", ["project", "create", name]);
    if (created.exitCode !== 0) {
      if (!/already exists/i.test(created.stdout + created.stderr)) {
        throw new Error(`No se pudo crear el proyecto: ${created.stderr.trim()}`);
      }
      await this.confirmReuse(name, config.reuseExistingProject === true, interactive, prompter);
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
        const detail = errorLine(connected.stderr + connected.stdout);
        const loginHint = /Login Connection/i.test(detail)
          ? " Conecta GitHub en Vercel (Account Settings > Authentication > Login Connections) y vuelve a conectar el repositorio desde el panel del proyecto. Mientras tanto, los despliegues siguen funcionando con pnpm desplegar."
          : " Conéctalo desde el panel de Vercel si quieres despliegues por push; los despliegues con pnpm desplegar siguen funcionando.";
        prompter.info(`No se pudo conectar el repositorio de GitHub (${detail}).${loginHint}`);
      }
    }
    state.projectId = link.projectId;
  }

  private async confirmReuse(
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

function errorLine(output: string): string {
  const lines = output.split("\n").map((line) => line.trim());
  return lines.find((line) => /^error/i.test(line)) ?? lines.find(Boolean) ?? "sin detalle";
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
