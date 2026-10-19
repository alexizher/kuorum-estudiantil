#!/usr/bin/env node
import { parseArgs } from "node:util";
import { buildDeployWizard } from "./composition.js";

const USAGE = `Uso: kuorum desplegar [--config <ruta>]

  desplegar         Despliega una instalación en Vercel
  --config <ruta>   Lee la configuración de un JSON y no pregunta nada
`;

async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { config: { type: "string" } },
  });
  if (positionals[0] !== "desplegar") {
    process.stderr.write(USAGE);
    return 2;
  }
  const wizard = buildDeployWizard({
    cwd: process.cwd(),
    ...(values.config !== undefined ? { configPath: values.config } : {}),
  });
  return wizard.run();
}

process.exit(await main(process.argv.slice(2)));
