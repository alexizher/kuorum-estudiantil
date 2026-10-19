import type { DeployContext, Step } from "../wizard/step.js";

interface SalidaJsonDeploy {
  status?: unknown;
  deployment?: {
    url?: unknown;
    productionUrl?: unknown;
    readyState?: unknown;
  };
}

function esUrl(valor: unknown): valor is string {
  return typeof valor === "string" && valor.startsWith("https://");
}

function leerJson(stdout: string): SalidaJsonDeploy | undefined {
  try {
    const valor: unknown = JSON.parse(stdout);
    return typeof valor === "object" && valor !== null && !Array.isArray(valor)
      ? (valor as SalidaJsonDeploy)
      : undefined;
  } catch {
    return undefined;
  }
}

// La URL del despliegue generado queda detrás de Vercel Authentication; la de producción es la que se verifica.
function urlDesdeJson(json: SalidaJsonDeploy): string {
  const readyState = json.deployment?.readyState;
  if (json.status !== "ok" || readyState !== "READY") {
    throw new Error(
      `El despliegue no terminó bien (status: ${String(json.status)}, readyState: ${String(readyState)}).`,
    );
  }
  const url = [json.deployment?.productionUrl, json.deployment?.url].find(esUrl);
  if (!url) throw new Error("El despliegue terminó pero no se encontró la URL en la salida.");
  return url;
}

function urlDesdeTexto(stdout: string): string | undefined {
  const lineas = stdout.split("\n").map((line) => line.trim());
  const aliased = lineas.find((line) => line.includes("Aliased") && line.includes("https://"));
  if (aliased) return aliased.match(/https:\/\/\S+/)?.[0];
  return lineas.filter((line) => line.startsWith("https://")).at(-1);
}

export class DeployStep implements Step {
  readonly id = "despliegue";
  readonly description =
    "Creando el despliegue de producción del proyecto en Vercel (puede tardar unos minutos)";

  async run({ runner, state }: DeployContext): Promise<void> {
    const result = await runner.run("vercel", ["deploy", "--prod", "--yes", "--non-interactive"]);
    if (result.exitCode !== 0) {
      throw new Error(`El despliegue falló: ${result.stderr.trim() || result.stdout.trim()}`);
    }
    const json = leerJson(result.stdout);
    const url = json ? urlDesdeJson(json) : urlDesdeTexto(result.stdout);
    if (!url) throw new Error("El despliegue terminó pero no se encontró la URL en la salida.");
    state.productionUrl = url;
  }
}
