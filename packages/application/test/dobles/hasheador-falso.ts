import type { Hasheador } from "../../src/puertos/hasheador.js";

/** Determinista y reversible a ojo, pero el texto original no aparece dentro del resultado. */
export class HasheadorFalso implements Hasheador {
  sha256(texto: string): string {
    return `h:${[...texto].reverse().join("")}`;
  }
}
