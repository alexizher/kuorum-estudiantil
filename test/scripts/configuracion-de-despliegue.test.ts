import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const leer = (ruta: string) => readFileSync(new URL(`../../${ruta}`, import.meta.url), "utf8");
const json = (ruta: string) => JSON.parse(leer(ruta)) as Record<string, unknown>;

describe("configuración de despliegue", () => {
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
