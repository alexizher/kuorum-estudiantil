import { parseArgs } from "node:util";

export const USAGE = `Uso: kuorum desplegar [--config <ruta>]

  desplegar         Despliega una instalación en Vercel
  --config <ruta>   Lee la configuración de un JSON y no pregunta nada
`;

export type Command = { kind: "desplegar"; configPath?: string } | { kind: "uso" };

export function parseCommand(argv: string[]): Command {
  try {
    const { values, positionals } = parseArgs({
      args: argv.filter((arg) => arg !== "--"), // pnpm reenvía el "--" tal cual
      allowPositionals: true,
      options: { config: { type: "string" } },
    });
    if (positionals[0] !== "desplegar" || positionals.length > 1) return { kind: "uso" };
    return values.config !== undefined
      ? { kind: "desplegar", configPath: values.config }
      : { kind: "desplegar" };
  } catch {
    return { kind: "uso" };
  }
}
