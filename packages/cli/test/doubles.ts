import type {
  CommandOptions,
  CommandResult,
  CommandRunner,
} from "../src/io/command-runner.js";
import type { Prompter } from "../src/io/prompter.js";
import type { StateRepository } from "../src/wizard/state-store.js";
import type { DeployState } from "../src/wizard/step.js";

export class FakeRunner implements CommandRunner {
  readonly calls: { command: string; args: string[]; options?: CommandOptions }[] = [];
  async run(command: string, args: string[], options?: CommandOptions): Promise<CommandResult> {
    this.calls.push({ command, args, ...(options ? { options } : {}) });
    return { exitCode: 0, stdout: "", stderr: "" };
  }
}

export class FakePrompter implements Prompter {
  readonly infos: string[] = [];
  readonly successes: string[] = [];
  readonly failures: string[] = [];
  constructor(private readonly answers: string[] = []) {}
  async text(opts: { message: string; initial?: string }): Promise<string> {
    return this.answers.shift() ?? opts.initial ?? "";
  }
  async confirm(): Promise<boolean> {
    return true;
  }
  info(message: string): void {
    this.infos.push(message);
  }
  success(message: string): void {
    this.successes.push(message);
  }
  fail(message: string): void {
    this.failures.push(message);
  }
}

export class MemoryStateStore implements StateRepository {
  constructor(public state: DeployState = { completedSteps: [] }) {}
  async load(): Promise<DeployState> {
    return structuredClone(this.state);
  }
  async save(state: DeployState): Promise<void> {
    this.state = structuredClone(state);
  }
}
