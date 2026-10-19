import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const configuracion = join(raiz, ".dependency-cruiser.cjs");
const depcruise = join(raiz, "node_modules/.bin/depcruise");

interface Violacion {
  rule: { name: string };
  from: string;
  to: string;
}

function cruzar(cwd: string, objetivos: string[]) {
  const ejecutar = (formato: string) =>
    spawnSync(depcruise, [...objetivos, "--config", configuracion, "--output-type", formato], {
      cwd,
      encoding: "utf8",
    });
  const salida = JSON.parse(ejecutar("json").stdout) as {
    summary: { violations: Violacion[] };
  };
  // Con el formato json depcruise sale con 0; el código real sale del formato por defecto.
  return { codigo: ejecutar("err").status, violaciones: salida.summary.violations };
}

describe("regla de dependencias entre capas", () => {
  const temporales: string[] = [];
  afterAll(() => {
    for (const dir of temporales) rmSync(dir, { recursive: true, force: true });
  });

  it("detecta que domain importe una dependencia externa", () => {
    const dir = mkdtempSync(join(tmpdir(), "capas-"));
    temporales.push(dir);
    mkdirSync(join(dir, "packages/domain/src"), { recursive: true });
    copyFileSync(
      join(raiz, "test/arquitectura/fixtures/domain-importa-prisma.ts"),
      join(dir, "packages/domain/src/domain-importa-prisma.ts"),
    );

    const { codigo, violaciones } = cruzar(dir, ["packages"]);

    expect(codigo).not.toBe(0);
    expect(violaciones.map((v) => v.rule.name)).toContain("domain-sin-dependencias");
  });

  it("el repositorio real no tiene violaciones", () => {
    const { codigo, violaciones } = cruzar(raiz, ["packages", "apps"]);

    expect(violaciones).toEqual([]);
    expect(codigo).toBe(0);
  });
});
