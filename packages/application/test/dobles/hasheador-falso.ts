import type { Hasheador } from "../../src/puertos/hasheador.js";

/** Determinista e inyectivo, pero el texto original no aparece dentro del resultado. */
export class HasheadorFalso implements Hasheador {
  sha256(texto: string): string {
    return `h:${[...texto].map((c) => String.fromCharCode(c.charCodeAt(0) + 1)).join("")}`;
  }
}
