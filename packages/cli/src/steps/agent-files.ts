import { access, rm } from "node:fs/promises";
import { join } from "node:path";

/**
 * vercel integration add instala skills del proveedor para agentes en la carpeta (CLI 64)
 * y no tiene una bandera para evitarlo.
 */
const AGENT_FILES = [".agents", ".claude", "skills-lock.json"];

export async function existingAgentFiles(cwd: string): Promise<Set<string>> {
  const found = await Promise.all(
    AGENT_FILES.map(async (name) => ((await exists(join(cwd, name))) ? [name] : [])),
  );
  return new Set(found.flat());
}

/** Borra los que aparecieron después de `before`; los que ya estaban no se tocan. */
export async function removeNewAgentFiles(cwd: string, before: Set<string>): Promise<void> {
  const added = AGENT_FILES.filter((name) => !before.has(name));
  await Promise.all(added.map((name) => rm(join(cwd, name), { recursive: true, force: true })));
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
