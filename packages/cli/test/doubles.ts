import type { CommandOptions, CommandResult, CommandRunner } from "../src/io/command-runner.js";
import type { Prompter } from "../src/io/prompter.js";
import type { StateRepository } from "../src/wizard/state-store.js";
import type { DeployContext, DeployState } from "../src/wizard/step.js";

export type RunnerScript = (command: string, args: string[]) => Partial<CommandResult> | undefined;

export class FakeRunner implements CommandRunner {
  readonly calls: { command: string; args: string[]; options?: CommandOptions }[] = [];
  constructor(private readonly script: RunnerScript = () => undefined) {}
  async run(command: string, args: string[], options?: CommandOptions): Promise<CommandResult> {
    this.calls.push({ command, args, ...(options ? { options } : {}) });
    return { exitCode: 0, stdout: "", stderr: "", ...this.script(command, args) };
  }
  /** Llamadas como texto, p. ej. "vercel link --yes". */
  get lines(): string[] {
    return this.calls.map((c) => [c.command, ...c.args].join(" "));
  }
}

export class FakePrompter implements Prompter {
  readonly infos: string[] = [];
  readonly successes: string[] = [];
  readonly failures: string[] = [];
  readonly confirmations: string[] = [];
  constructor(
    private readonly answers: string[] = [],
    private readonly confirmation = true,
  ) {}
  async text(opts: { message: string; initial?: string }): Promise<string> {
    return this.answers.shift() ?? opts.initial ?? "";
  }
  async confirm(message: string): Promise<boolean> {
    this.confirmations.push(message);
    return this.confirmation;
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

export function makeContext(overrides: Partial<DeployContext> = {}): DeployContext {
  return {
    config: { institutionName: "Universidad del Ejemplo", shortName: "ejemplo" },
    state: { completedSteps: [] },
    runner: new FakeRunner(),
    prompter: new FakePrompter(),
    fetch,
    sleep: async () => {},
    cwd: "/tmp",
    interactive: true,
    ...overrides,
  };
}
