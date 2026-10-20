#!/usr/bin/env node
import { USAGE, parseCommand } from "./cli.js";
import { buildDeployWizard, buildPublishWizard } from "./composition.js";

async function main(argv: string[]): Promise<number> {
  const command = parseCommand(argv);
  if (command.kind === "uso") {
    process.stderr.write(USAGE);
    return 2;
  }
  if (command.kind === "publicar") return buildPublishWizard({ cwd: process.cwd() }).run();
  const wizard = buildDeployWizard({
    cwd: process.cwd(),
    ...(command.configPath !== undefined ? { configPath: command.configPath } : {}),
  });
  return wizard.run();
}

// Nunca dejar un await sin resolver: cualquier fallo inesperado termina con código 1.
const code = await main(process.argv.slice(2)).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  return 1;
});
process.exit(code);
