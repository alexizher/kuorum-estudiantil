import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
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
      // El grafo en json de todo el repo ya pasa del 1 MB que spawnSync admite por defecto.
      maxBuffer: 256 * 1024 * 1024,
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

  // Árbol temporal con un paquete "destino" ya construido (exports a dist) y enlazado
  // por nombre desde el paquete "origen", como lo deja pnpm en un workspace real.
  function importarPorNombre(
    origen: string,
    destino: string,
    construido: boolean,
    carpetaDestino = "packages",
  ) {
    const dir = mkdtempSync(join(tmpdir(), "capas-"));
    temporales.push(dir);
    mkdirSync(join(dir, `packages/${origen}/src`), { recursive: true });
    mkdirSync(join(dir, `${carpetaDestino}/${destino}/src`), { recursive: true });
    writeFileSync(
      join(dir, `packages/${origen}/src/uso.ts`),
      `import { x } from "@kuorum/${destino}";\nexport const y = x;\n`,
    );
    writeFileSync(
      join(dir, `${carpetaDestino}/${destino}/package.json`),
      JSON.stringify({
        name: `@kuorum/${destino}`,
        type: "module",
        exports: { ".": "./dist/index.js" },
      }),
    );
    writeFileSync(join(dir, `${carpetaDestino}/${destino}/src/index.ts`), "export const x = 1;\n");
    if (construido) {
      mkdirSync(join(dir, `${carpetaDestino}/${destino}/dist`));
      writeFileSync(
        join(dir, `${carpetaDestino}/${destino}/dist/index.js`),
        "export const x = 1;\n",
      );
    }
    mkdirSync(join(dir, `packages/${origen}/node_modules/@kuorum`), { recursive: true });
    symlinkSync(
      join(dir, `${carpetaDestino}/${destino}`),
      join(dir, `packages/${origen}/node_modules/@kuorum/${destino}`),
    );
    return cruzar(dir, [...new Set(["packages", carpetaDestino])]);
  }

  it.each([true, false])(
    "application importando infrastructure por nombre rompe application-solo-domain (construido: %s)",
    (construido) => {
      const { codigo, violaciones } = importarPorNombre(
        "application",
        "infrastructure",
        construido,
      );
      expect(codigo).not.toBe(0);
      expect(violaciones.map((v) => v.rule.name)).toContain("application-solo-domain");
    },
  );

  it.each([true, false])(
    "importar @kuorum/cli por nombre rompe nadie-importa-cli (construido: %s)",
    (construido) => {
      const { violaciones } = importarPorNombre("application", "cli", construido);
      expect(violaciones.map((v) => v.rule.name)).toContain("nadie-importa-cli");
    },
  );

  it.each([true, false])(
    "importar @kuorum/web por nombre rompe nadie-importa-apps (construido: %s)",
    (construido) => {
      const { violaciones } = importarPorNombre("application", "web", construido, "apps");
      expect(violaciones.map((v) => v.rule.name)).toContain("nadie-importa-apps");
    },
  );

  it.each([true, false])(
    "contracts importando domain por nombre rompe contracts-sin-capas (construido: %s)",
    (construido) => {
      const { codigo, violaciones } = importarPorNombre("contracts", "domain", construido);
      expect(codigo).not.toBe(0);
      expect(violaciones.map((v) => v.rule.name)).toContain("contracts-sin-capas");
    },
  );

  it.each([true, false])(
    "ui importando domain por nombre rompe ui-sin-capas (construido: %s)",
    (construido) => {
      const { codigo, violaciones } = importarPorNombre("ui", "domain", construido);
      expect(codigo).not.toBe(0);
      expect(violaciones.map((v) => v.rule.name)).toContain("ui-sin-capas");
    },
  );

  it("ui importando contracts por nombre es válido", () => {
    const { codigo, violaciones } = importarPorNombre("ui", "contracts", true);
    expect(violaciones).toEqual([]);
    expect(codigo).toBe(0);
  });

  it("ui importando un módulo de Node o una librería ajena rompe ui-sin-capas, react y qrcode no", () => {
    const dir = mkdtempSync(join(tmpdir(), "capas-"));
    temporales.push(dir);
    mkdirSync(join(dir, "packages/ui/src"), { recursive: true });
    writeFileSync(
      join(dir, "packages/ui/src/uso.ts"),
      [
        'import { useState } from "react";',
        'import { jsx } from "react/jsx-runtime";',
        'import QRCode from "qrcode";',
        'import { readFileSync } from "node:fs";',
        'import { z } from "zod";',
        "export const y = [useState, jsx, QRCode, readFileSync, z];",
        "",
      ].join("\n"),
    );

    const { codigo, violaciones } = cruzar(dir, ["packages"]);

    const ofensores = violaciones
      .filter((v) => v.rule.name === "ui-sin-capas")
      .map((v) => v.to)
      .sort();
    expect(codigo).not.toBe(0);
    expect(ofensores).toEqual(["fs", "zod"]);
  });

  it("application importando domain por nombre es válido", () => {
    const { codigo, violaciones } = importarPorNombre("application", "domain", true);
    expect(violaciones).toEqual([]);
    expect(codigo).toBe(0);
  });

  it("el repositorio real no tiene violaciones", () => {
    const { codigo, violaciones } = cruzar(raiz, ["packages", "apps"]);

    expect(violaciones).toEqual([]);
    expect(codigo).toBe(0);
  });
});
