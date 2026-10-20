import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { DeployState } from "./step.js";

export interface StateRepository {
  load(): Promise<DeployState>;
  save(state: DeployState): Promise<void>;
}

export class CorruptStateError extends Error {
  constructor(readonly path: string) {
    super(
      `El archivo de estado ${path} está dañado. Bórralo para empezar de nuevo (los recursos ya creados en Vercel se reutilizan si coinciden por nombre).`,
    );
    this.name = "CorruptStateError";
  }
}

export class StateStore implements StateRepository {
  constructor(private readonly path: string) {}

  async load(): Promise<DeployState> {
    let text: string;
    try {
      text = await readFile(this.path, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { completedSteps: [] };
      throw error;
    }
    try {
      const parsed: unknown = JSON.parse(text);
      if (!isState(parsed)) throw new CorruptStateError(this.path);
      return parsed;
    } catch {
      throw new CorruptStateError(this.path);
    }
  }

  async save(state: DeployState): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    const temp = `${this.path}.${process.pid}.tmp`;
    await writeFile(temp, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    await rename(temp, this.path);
  }
}

function isState(value: unknown): value is DeployState {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { completedSteps?: unknown }).completedSteps)
  );
}
