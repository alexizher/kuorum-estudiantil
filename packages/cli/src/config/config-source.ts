import { readFile } from "node:fs/promises";
import type { Prompter } from "../io/prompter.js";
import { parseDeployConfig, slugify, validateField, type DeployConfig } from "./deploy-config.js";

export interface ConfigSource {
  load(): Promise<DeployConfig>;
}

export class InteractiveConfigSource implements ConfigSource {
  constructor(private readonly prompter: Prompter) {}

  async load(): Promise<DeployConfig> {
    const institutionName = await this.prompter.text({
      message: "Nombre de la institución",
      validate: (v) => validateField("institutionName", v),
    });
    const shortName = await this.prompter.text({
      message: "Nombre corto (se usa en la URL y en el proyecto)",
      initial: slugify(institutionName),
      validate: (v) => validateField("shortName", v),
    });
    return parseDeployConfig({ institutionName, shortName });
  }
}

export class FileConfigSource implements ConfigSource {
  constructor(private readonly path: string) {}

  async load(): Promise<DeployConfig> {
    const text = await readFile(this.path, "utf8");
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      throw new Error(`El archivo ${this.path} no es JSON válido.`);
    }
    return parseDeployConfig(raw);
  }
}
