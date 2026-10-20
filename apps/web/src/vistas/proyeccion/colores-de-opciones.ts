import type { ColorDeTinta } from "@kuorum/ui";

const COLOR_POR_TEXTO: Record<string, ColorDeTinta> = {
  sí: "si",
  no: "no",
  "me abstengo": "ambar",
};

function normalizar(texto: string): string {
  return texto.trim().toLowerCase();
}

/** Verde, rojo y ámbar solo cuando las opciones son exactamente Sí, No y Me abstengo. */
export function coloresDeOpciones(textos: readonly string[]): ColorDeTinta[] {
  const claves = textos.map(normalizar);
  const esElConjunto =
    claves.length === 3 && Object.keys(COLOR_POR_TEXTO).every((clave) => claves.includes(clave));
  return claves.map((clave) => (esElConjunto ? (COLOR_POR_TEXTO[clave] ?? "tinta") : "tinta"));
}
