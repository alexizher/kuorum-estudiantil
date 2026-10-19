import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { DeployState } from "./step.js";

export interface StateRepository {
  load(): Promise<DeployState>;
  save(state: DeployState): Promise<void>;
}

export class StateStore implements StateRepository {
  constructor(private readonly path: string) {}

  async load(): Promise<DeployState> {
    try {
      return JSON.parse(await readFile(this.path, "utf8")) as DeployState;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { completedSteps: [] };
      throw error;
    }
  }

  async save(state: DeployState): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    const temp = `${this.path}.${process.pid}.tmp`;
    await writeFile(temp, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    await rename(temp, this.path);
  }
}
