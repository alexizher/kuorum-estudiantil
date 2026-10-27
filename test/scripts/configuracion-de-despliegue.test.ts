import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const leer = (ruta: string) => readFileSync(new URL(`../../${ruta}`, import.meta.url), "utf8");
const json = (ruta: string) => JSON.parse(leer(ruta)) as Record<string, unknown>;

/** Variables que lee apps/web/src, por process.env o por el objeto de entorno inyectado. */
function variablesDeLaWeb(): string[] {
  const raiz = new URL("../../apps/web/src/", import.meta.url);
  const archivos = readdirSync(raiz, { recursive: true, encoding: "utf8" }).filter((ruta) =>
    /\.tsx?$/.test(ruta),
  );
  const nombres = archivos.flatMap((ruta) =>
    [
      ...readFileSync(new URL(ruta, raiz), "utf8").matchAll(
        /(?:process\.env|entorno)(?:\.|\[")([A-Z][A-Z0-9_]+)/g,
      ),
    ].map((m) => m[1] as string),
  );
  return [...new Set(nombres)].filter((nombre) => nombre !== "NODE_ENV");
}

describe("configuración de despliegue", () => {
  describe("entorno de turbo", () => {
    const build = (json("turbo.json")["tasks"] as Record<string, { env?: string[] }>)["build"];

    it("el build declara las variables de la base, la sesión y el despliegue", () => {
      expect(build?.env).toEqual(
        expect.arrayContaining([
          "DATABASE_URL",
          "DATABASE_URL_UNPOOLED",
          "VERCEL_ENV",
          "KUORUM_SECRETO",
          "BETTER_AUTH_SECRET",
          "BETTER_AUTH_URL",
          "KUORUM_INSTITUCION_NOMBRE",
        ]),
      );
    });

    it("el build declara cada variable que lee apps/web/src", () => {
      const leidas = variablesDeLaWeb();
      expect(leidas.length).toBeGreaterThan(0);
      expect(build?.env).toEqual(expect.arrayContaining(leidas));
    });
  });

  it("el build solo migra a través del script que mira VERCEL_ENV", () => {
    const comando = String(json("apps/web/vercel.json")["buildCommand"]);
    expect(comando).toContain("node scripts/migrar-si-produccion.mjs");
    expect(comando).not.toContain("db:deploy");
  });

  it("exige Node >=22 en local y fija Node 24 en Vercel", () => {
    expect(json("package.json")["engines"]).toEqual({ node: ">=22" });
    expect(json("apps/web/package.json")["engines"]).toEqual({ node: "24.x" });
  });

  it(".vercelignore deja fuera secretos y artefactos locales", () => {
    const lineas = leer(".vercelignore").split("\n");
    for (const ruta of [".env*", ".kuorum", ".superpowers", "**/dist", ".turbo", "node_modules"]) {
      expect(lineas).toContain(ruta);
    }
  });
});
