import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type VercelLink = { projectId: string; orgId?: string };

/** Lee el enlace que deja vercel link en .vercel/project.json. */
export async function readLink(cwd: string): Promise<VercelLink> {
  let raw: { projectId?: unknown; orgId?: unknown };
  try {
    raw = JSON.parse(await readFile(join(cwd, ".vercel", "project.json"), "utf8")) as typeof raw;
  } catch {
    throw new Error("No se pudo leer .vercel/project.json después de enlazar el proyecto.");
  }
  if (typeof raw.projectId !== "string") {
    throw new Error(".vercel/project.json no tiene projectId.");
  }
  return typeof raw.orgId === "string"
    ? { projectId: raw.projectId, orgId: raw.orgId }
    : { projectId: raw.projectId };
}
