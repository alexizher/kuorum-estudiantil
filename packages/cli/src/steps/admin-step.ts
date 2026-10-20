import { rmSync } from "node:fs";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateField } from "../config/deploy-config.js";
import type { DeployContext, ResultadoDePaso, Step } from "../wizard/step.js";

/** Lee líneas CLAVE=valor (con o sin comillas dobles), como las deja `vercel env pull`. */
export function parseEnvFile(text: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    let value = (match[2] ?? "").trim();
    if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1).replace(/\\n/g, "\n").replace(/\\"/g, '"');
    }
    env[match[1] as string] = value;
  }
  return env;
}

const SECRET_NAMES = /^(DATABASE_URL.*|BETTER_AUTH_SECRET|KUORUM_SECRETO)$/;

/** Primera línea del error, sin URLs de Postgres ni valores secretos conocidos. */
export function redact(text: string, env: Record<string, string> = {}): string {
  let line =
    text
      .split("\n")
      .find((l) => l.trim() !== "")
      ?.trim() ?? "";
  for (const [name, value] of Object.entries(env)) {
    if (SECRET_NAMES.test(name) && value.length >= 4) line = line.split(value).join("[oculto]");
  }
  line = line.replace(/postgres(?:ql)?:\/\/\S+/gi, "[URL oculta]");
  return line.length > 300 ? `${line.slice(0, 300)}...` : line;
}

export interface SignalEmitter {
  on(signal: "SIGINT" | "SIGTERM", listener: () => void): unknown;
  off(signal: "SIGINT" | "SIGTERM", listener: () => void): unknown;
}

export class AdminStep implements Step {
  constructor(
    private readonly signals: SignalEmitter = process,
    private readonly exit: (code: number) => void = (code) => process.exit(code),
  ) {}

  readonly id = "administrador";
  readonly description = "Creando la cuenta de la mesa en la base de producción";

  async run({ config, runner, prompter, interactive }: DeployContext): Promise<ResultadoDePaso> {
    let email = config.adminEmail;
    let name = config.adminName;
    if ((email === undefined || name === undefined) && !interactive) {
      prompter.info(
        "Sin adminEmail y adminName en la configuración, se omite la cuenta de la mesa. " +
          "Agrégalos y vuelve a correr pnpm desplegar.",
      );
      return "omitido";
    }
    email ??= await prompter.text({
      message: "Correo de la persona administradora de la mesa",
      validate: (v) => validateField("adminEmail", v),
    });
    name ??= await prompter.text({
      message: "Nombre de la persona administradora",
      validate: (v) => validateField("adminName", v),
    });

    const directory = await mkdtemp(join(tmpdir(), "kuorum-"));
    const envFile = join(directory, "produccion.env");
    // Ctrl-C o kill: el archivo con secretos no puede quedar en tmp.
    const onSignal = () => {
      rmSync(directory, { recursive: true, force: true });
      this.exit(130);
    };
    this.signals.on("SIGINT", onSignal);
    this.signals.on("SIGTERM", onSignal);
    try {
      await writeFile(envFile, "", { mode: 0o600 });
      const pull = await runner.run("vercel", [
        "env",
        "pull",
        envFile,
        "--environment",
        "production",
        "--yes",
      ]);
      if (pull.exitCode !== 0) {
        throw new Error(`No se pudieron traer las variables de producción: ${pull.stderr.trim()}`);
      }
      await chmod(envFile, 0o600);
      const env = parseEnvFile(await readFile(envFile, "utf8"));
      const created = await runner.run(
        "pnpm",
        [
          "--filter",
          "@kuorum/web",
          "exec",
          "tsx",
          "scripts/crear-admin.ts",
          "--correo",
          email,
          "--nombre",
          name,
          "--generar",
        ],
        { env },
      );
      if (created.exitCode !== 0) {
        if (/ya existe/i.test(created.stderr)) {
          prompter.info(`Ya existe una cuenta con el correo ${email}; no se creó otra.`);
          return;
        }
        throw new Error(`No se pudo crear la cuenta de la mesa: ${redact(created.stderr, env)}`);
      }
      const password = created.stdout
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .at(-1);
      if (!password) throw new Error("crear-admin no devolvió la contraseña generada.");
      prompter.success(
        `Cuenta de la mesa creada para ${email}. Contraseña: ${password}\n` +
          "Guárdala ahora: no se vuelve a mostrar ni queda guardada en ningún lado.",
      );
    } finally {
      this.signals.off("SIGINT", onSignal);
      this.signals.off("SIGTERM", onSignal);
      await rm(directory, { recursive: true, force: true });
    }
  }
}
