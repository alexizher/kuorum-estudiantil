import { chmod, mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
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

export class AdminStep implements Step {
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
        throw new Error(`No se pudo crear la cuenta de la mesa: ${created.stderr.trim()}`);
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
      await rm(directory, { recursive: true, force: true });
    }
  }
}
