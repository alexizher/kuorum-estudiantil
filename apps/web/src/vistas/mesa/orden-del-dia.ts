/** Un punto por línea; sin espacios sobrantes ni líneas vacías. */
export function puntosDeTexto(texto: string): string[] {
  return texto
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter((linea) => linea !== "");
}
