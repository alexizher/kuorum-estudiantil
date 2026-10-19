import { spawn } from "node:child_process";

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface CommandOptions {
  input?: string;
  env?: Record<string, string>;
  inheritStdio?: boolean;
}

export interface CommandRunner {
  run(command: string, args: string[], options?: CommandOptions): Promise<CommandResult>;
}

export class SpawnCommandRunner implements CommandRunner {
  run(command: string, args: string[], options: CommandOptions = {}): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        env: { ...process.env, ...options.env },
        stdio: options.inheritStdio ? "inherit" : ["pipe", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";
      child.stdout?.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
      child.stderr?.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
      child.on("error", reject);
      child.on("close", (code) => resolve({ exitCode: code ?? 1, stdout, stderr }));
      if (!options.inheritStdio) {
        // Si el proceso termina sin leer stdin, escribir da EPIPE; el código de salida ya lo cuenta.
        child.stdin?.on("error", (error: NodeJS.ErrnoException) => {
          if (error.code !== "EPIPE") reject(error);
        });
        child.stdin?.end(options.input ?? "");
      }
    });
  }
}
