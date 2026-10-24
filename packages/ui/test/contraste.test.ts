// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../src/tokens.css", import.meta.url), "utf8");

function bloque(selector: string): Record<string, string> {
  const inicio = css.indexOf(selector + " {");
  expect(inicio, selector).toBeGreaterThanOrEqual(0);
  const cuerpo = css.slice(css.indexOf("{", inicio) + 1, css.indexOf("}", inicio));
  const tokens: Record<string, string> = {};
  for (const m of cuerpo.matchAll(
    /--([\w-]+):\s*(?:var\(--[\w-]+,\s*(#[0-9A-Fa-f]{6})\)|(#[0-9A-Fa-f]{6}))/g,
  )) {
    const nombre = m[1];
    const valor = m[2] ?? m[3];
    if (nombre && valor) tokens[nombre] = valor;
  }
  return tokens;
}

function token(tokens: Record<string, string>, nombre: string): string {
  const valor = tokens[nombre];
  if (valor === undefined) throw new Error(`falta el token --${nombre}`);
  return valor;
}

function luminancia(hex: string): number {
  const canal = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(0) + 0.7152 * canal(1) + 0.0722 * canal(2);
}

function contraste(a: string, b: string): number {
  const [la, lb] = [luminancia(a), luminancia(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const temas = {
  claro: bloque(":root"),
  oscuro: bloque(':root[data-tema="oscuro"]'),
};

// Pares [texto, fondo] que la interfaz usa de verdad.
const pares: [string, string][] = [
  ["tinta", "papel"],
  ["tinta", "superficie"],
  ["tinta-suave", "papel"],
  ["tinta-suave", "superficie"],
  ["si-texto", "papel"],
  ["no-texto", "papel"],
  ["ambar-texto", "papel"],
  ["ambar-texto", "ambar-fondo"],
  ["tinta", "ambar-fondo"],
  ["sobre-tinta", "tinta"],
  ["sobre-color", "si"],
  ["sobre-ambar", "ambar"],
  ["foco", "papel"],
];

describe("contraste AA de los tokens", () => {
  for (const [tema, tokens] of Object.entries(temas)) {
    for (const [texto, fondo] of pares) {
      it(`${tema}: ${texto} sobre ${fondo} llega a 4,5`, () => {
        expect(contraste(token(tokens, texto), token(tokens, fondo))).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it("el borde de los controles llega a 3 contra el fondo en ambos temas", () => {
    for (const tokens of Object.values(temas)) {
      expect(
        contraste(token(tokens, "borde-control"), token(tokens, "papel")),
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it("el bloque oscuro de prefers-color-scheme repite los valores de data-tema=oscuro", () => {
    const inicio = css.indexOf("@media (prefers-color-scheme: dark)");
    const media = css.slice(inicio, css.indexOf('\n:root[data-tema="oscuro"]'));
    for (const [nombre, valor] of Object.entries(temas.oscuro)) {
      // El media query puede tener var(--color-primario, #valor) o #valor directamente
      const patron = new RegExp(`--${nombre}:\\s*(?:var\\(--[\\w-]+,\\s*${valor}\\)|${valor});`);
      expect(media, nombre).toMatch(patron);
    }
  });
});

describe("áreas táctiles", () => {
  it("el interruptor de tema mide 44 px sin depender de pseudoelementos recortados", () => {
    const componentes = readFileSync(new URL("../src/componentes.css", import.meta.url), "utf8");
    const regla = /\n\.tema \{([^}]*)\}/.exec(componentes)?.[1] ?? "";
    expect(regla).toMatch(/min-height:\s*44px/);
    expect(regla).toMatch(/min-width:\s*44px/);
  });
});
