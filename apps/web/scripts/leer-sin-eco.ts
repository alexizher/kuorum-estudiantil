/** Lo mínimo de `process.stdin` en una terminal que necesita la lectura sin eco. */
export interface EntradaDeTerminal {
  setRawMode(modo: boolean): unknown;
  setEncoding(codificacion: BufferEncoding): unknown;
  resume(): unknown;
  pause(): unknown;
  on(evento: "data", oyente: (trozo: string) => void): unknown;
  off(evento: "data", oyente: (trozo: string) => void): unknown;
}

const ENTER = new Set(["\r", "\n"]);
const BORRAR = new Set(["\u007f", "\b"]);
const CTRL_C = "\u0003";
const CTRL_D = "\u0004";

/**
 * Muestra `pregunta` y lee una línea con la terminal en modo crudo, sin repetir lo que se teclea.
 * La terminal vuelve al modo normal al terminar o al cancelar con Ctrl+C.
 */
export function leerSinEco(
  entrada: EntradaDeTerminal,
  salida: (texto: string) => void,
  pregunta: string,
): Promise<string> {
  return new Promise((resolver, rechazar) => {
    let escrito = "";
    const terminar = () => {
      entrada.off("data", alRecibir);
      entrada.setRawMode(false);
      entrada.pause();
      salida("\n");
    };
    function alRecibir(trozo: string) {
      for (const caracter of trozo) {
        if (caracter === CTRL_C) {
          terminar();
          rechazar(new Error("Cancelado."));
          return;
        }
        if (ENTER.has(caracter) || caracter === CTRL_D) {
          terminar();
          resolver(escrito);
          return;
        }
        // Array.from recorre por punto de código: borrar no parte un emoji ni una tilde compuesta.
        escrito = BORRAR.has(caracter)
          ? Array.from(escrito).slice(0, -1).join("")
          : escrito + caracter;
      }
    }
    salida(pregunta);
    entrada.setRawMode(true);
    entrada.setEncoding("utf8");
    entrada.on("data", alRecibir);
    entrada.resume();
  });
}
