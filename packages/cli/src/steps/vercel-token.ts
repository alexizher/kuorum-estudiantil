import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface TokenReader {
  read(): Promise<string | undefined>;
}

/** Lee el token de VERCEL_TOKEN o del archivo de sesión de la CLI. Nunca lo imprime ni lo guarda. */
export class VercelTokenReader implements TokenReader {
  constructor(
    private readonly env: Record<string, string | undefined>,
    private readonly platform: string,
    private readonly home: string,
  ) {}

  async read(): Promise<string | undefined> {
    if (this.env["VERCEL_TOKEN"]) return this.env["VERCEL_TOKEN"];
    try {
      const raw: unknown = JSON.parse(await readFile(this.authFile(), "utf8"));
      const token = (raw as { token?: unknown }).token;
      return typeof token === "string" && token !== "" ? token : undefined;
    } catch {
      return undefined;
    }
  }

  private authFile(): string {
    const dataDir =
      this.platform === "darwin"
        ? join(this.home, "Library", "Application Support")
        : this.platform === "win32"
          ? (this.env["APPDATA"] ?? join(this.home, "AppData", "Roaming"))
          : (this.env["XDG_DATA_HOME"] ?? join(this.home, ".local", "share"));
    return join(dataDir, "com.vercel.cli", "auth.json");
  }
}
