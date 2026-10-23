const EXTRAS_WINANSI = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");

function cabeEnWinAnsi(caracter: string): boolean {
  const codigo = caracter.codePointAt(0) ?? 0;
  return (
    (codigo >= 0x20 && codigo <= 0x7e) ||
    (codigo >= 0xa0 && codigo <= 0xff) ||
    EXTRAS_WINANSI.has(caracter)
  );
}

/**
 * Reemplaza con "?" lo que la fuente estándar no puede dibujar. Compone antes las tildes
 * que llegan separadas de su letra; tabuladores y saltos de línea quedan como espacio.
 */
export function aWinAnsi(texto: string): string {
  let salida = "";
  for (const caracter of texto.normalize("NFC").replace(/\r\n/g, "\n")) {
    if (caracter === "\t" || caracter === "\n" || caracter === "\r") salida += " ";
    else salida += cabeEnWinAnsi(caracter) ? caracter : "?";
  }
  return salida;
}

function cortarPalabra(palabra: string, ancho: number, medir: (t: string) => number): string[] {
  const trozos: string[] = [];
  let actual = "";
  for (const caracter of palabra) {
    if (actual !== "" && medir(actual + caracter) > ancho) {
      trozos.push(actual);
      actual = "";
    }
    actual += caracter;
  }
  if (actual !== "") trozos.push(actual);
  return trozos;
}

/** Parte un párrafo (sin saltos de línea) en líneas que no pasan de `ancho`. */
export function partirEnLineas(
  texto: string,
  ancho: number,
  medir: (t: string) => number,
): string[] {
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of texto.split(/ +/).filter((p) => p !== "")) {
    const trozos = medir(palabra) > ancho ? cortarPalabra(palabra, ancho, medir) : [palabra];
    for (const trozo of trozos) {
      const candidata = actual === "" ? trozo : `${actual} ${trozo}`;
      if (medir(candidata) <= ancho) {
        actual = candidata;
      } else {
        lineas.push(actual);
        actual = trozo;
      }
    }
  }
  lineas.push(actual);
  return lineas;
}

export function textoDeAsistencia(asistentes: number | null): string {
  if (asistentes === null) return "Sin registro de asistencia";
  return asistentes === 1
    ? "Asistencia: 1 código activado"
    : `Asistencia: ${asistentes} códigos activados`;
}
