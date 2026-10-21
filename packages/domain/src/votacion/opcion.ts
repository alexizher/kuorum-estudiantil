import { ErrorDeDominio } from "../errores.js";

const TEXTO_MIN = 1;
const TEXTO_MAX = 80;

export const OPCIONES_SI_NO_ABSTENCION = ["Sí", "No", "Me abstengo"];

export class Opcion {
  readonly texto: string;

  constructor(
    readonly id: string,
    texto: string,
    readonly orden: number,
  ) {
    const limpio = texto.trim();
    if (limpio.length < TEXTO_MIN || limpio.length > TEXTO_MAX) {
      throw new ErrorDeDominio("TEXTO_OPCION_INVALIDO");
    }
    this.texto = limpio;
  }
}
