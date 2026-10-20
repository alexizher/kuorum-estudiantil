import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { VercelTokenReader } from "../../src/steps/vercel-token.js";

describe("VercelTokenReader", () => {
  it("prefiere VERCEL_TOKEN", async () => {
    const reader = new VercelTokenReader({ VERCEL_TOKEN: "desde-env" }, "linux", "/nada");
    expect(await reader.read()).toBe("desde-env");
  });

  it("lee el archivo de la CLI en Linux (XDG_DATA_HOME)", async () => {
    const home = await mkdtemp(join(tmpdir(), "kuorum-token-"));
    try {
      await mkdir(join(home, "datos", "com.vercel.cli"), { recursive: true });
      await writeFile(
        join(home, "datos", "com.vercel.cli", "auth.json"),
        JSON.stringify({ token: "desde-archivo" }),
      );
      const reader = new VercelTokenReader({ XDG_DATA_HOME: join(home, "datos") }, "linux", home);
      expect(await reader.read()).toBe("desde-archivo");
    } finally {
      await rm(home, { recursive: true });
    }
  });

  it("devuelve undefined si no hay ni variable ni archivo", async () => {
    expect(await new VercelTokenReader({}, "linux", "/no/existe").read()).toBeUndefined();
  });
});
