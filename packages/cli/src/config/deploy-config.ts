import { z } from "zod";

export const SHORT_NAME_PATTERN = /^[a-z0-9-]{3,40}$/;

export const DeployConfigSchema = z.object({
  institutionName: z.string().min(2).max(120),
  shortName: z.string().regex(SHORT_NAME_PATTERN),
  reuseExistingProject: z.boolean().optional(),
  adminEmail: z.email().max(254).optional(),
  adminName: z.string().min(2).max(120).optional(),
});

export type DeployConfig = z.infer<typeof DeployConfigSchema>;

const RULES: Record<string, string> = {
  institutionName: "debe tener entre 2 y 120 caracteres",
  adminEmail: "debe ser un correo válido",
  adminName: "debe tener entre 2 y 120 caracteres",
  shortName: "debe tener entre 3 y 40 caracteres: minúsculas sin tildes, números y guiones",
};

export class MissingConfigError extends Error {
  constructor(readonly field: string) {
    super(`Falta el campo obligatorio "${field}" en la configuración.`);
    this.name = "MissingConfigError";
  }
}

export class InvalidConfigError extends Error {
  constructor(
    readonly field: string,
    readonly rule: string,
  ) {
    super(`El campo "${field}" no es válido: ${rule}.`);
    this.name = "InvalidConfigError";
  }
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

export function validateField(field: keyof DeployConfig, value: string): string | undefined {
  const result = DeployConfigSchema.shape[field].safeParse(value);
  return result.success ? undefined : (RULES[field] ?? "valor inválido");
}

export function parseDeployConfig(raw: unknown): DeployConfig {
  const result = DeployConfigSchema.safeParse(raw);
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  const field = String(issue?.path[0] ?? "configuración");
  const record = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  if (record[field] === undefined) throw new MissingConfigError(field);
  throw new InvalidConfigError(field, RULES[field] ?? "valor inválido");
}
