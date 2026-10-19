#!/usr/bin/env node
import { USAGE, parseCommand } from "./cli.js";
import { buildDeployWizard } from "./composition.js";

async function main(argv: string[]): Promise<number> {
  const command = parseCommand(argv);
  if (command.kind === "uso") {
    process.stderr.write(USAGE);
    return 2;
  }
  const wizard = buildDeployWizard({
    cwd: process.cwd(),
    ...(command.configPath !== undefined ? { configPath: command.configPath } : {}),
  });
  return wizard.run();
}

process.exit(await main(process.argv.slice(2)));
