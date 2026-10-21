import { parseArgs } from "node:util";

export const USAGE = `Uso: kuorum desplegar [--config <ruta>]
     kuorum publicar

  desplegar         Despliega una instalación en Vercel
  --config <ruta>   Lee la configuración de un JSON y no pregunta nada
  publicar          Sube una versión nueva a una instalación ya creada (despliegue y verificación)
`;

export type Command =
  { kind: "desplegar"; configPath?: string } | { kind: "publicar" } | { kind: "uso" };

export function parseCommand(argv: string[]): Command {
  try {
    const { values, positionals } = parseArgs({
      args: argv.filter((arg) => arg !== "--"), // pnpm reenvía el "--" tal cual
      allowPositionals: true,
      options: { config: { type: "string" } },
    });
    if (positionals.length !== 1) return { kind: "uso" };
    if (positionals[0] === "publicar") {
      return values.config === undefined ? { kind: "publicar" } : { kind: "uso" };
    }
    if (positionals[0] !== "desplegar") return { kind: "uso" };
    return values.config !== undefined
      ? { kind: "desplegar", configPath: values.config }
      : { kind: "desplegar" };
  } catch {
    return { kind: "uso" };
  }
}
