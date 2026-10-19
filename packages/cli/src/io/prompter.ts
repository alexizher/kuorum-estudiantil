import { cancel, confirm, isCancel, log, text } from "@clack/prompts";

export interface Prompter {
  text(opts: {
    message: string;
    initial?: string;
    validate?: (v: string) => string | undefined;
  }): Promise<string>;
  confirm(message: string): Promise<boolean>;
  info(message: string): void;
  success(message: string): void;
  fail(message: string): void;
}

/** El mensaje de cancelación ya lo mostró clack; quien la capture no debe repetirlo. */
export class PromptCancelledError extends Error {
  constructor() {
    super("Operación cancelada por la persona usuaria.");
    this.name = "PromptCancelledError";
  }
}

function unwrap<T>(value: T | symbol): T {
  if (isCancel(value) || typeof value === "symbol") {
    cancel("Operación cancelada.");
    throw new PromptCancelledError();
  }
  return value as T;
}

export class ClackPrompter implements Prompter {
  async text(opts: {
    message: string;
    initial?: string;
    validate?: (v: string) => string | undefined;
  }): Promise<string> {
    const value = await text({
      message: opts.message,
      ...(opts.initial !== undefined ? { initialValue: opts.initial } : {}),
      ...(opts.validate ? { validate: (v) => opts.validate?.(v ?? "") } : {}),
    });
    return unwrap<string>(value);
  }

  async confirm(message: string): Promise<boolean> {
    return unwrap<boolean>(await confirm({ message }));
  }

  info(message: string): void {
    log.info(message);
  }

  success(message: string): void {
    log.success(message);
  }

  fail(message: string): void {
    log.error(message);
  }
}
