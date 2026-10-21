import { randomInt } from "node:crypto";
import {
  ALFABETO_DE_CODIGOS as ALFABETO,
  CodigoDeAcceso,
  CodigoDeSala,
  type GeneradorDeCodigos,
} from "@kuorum/domain";

function aleatorio(largo: number): string {
  let texto = "";
  for (let i = 0; i < largo; i += 1) texto += ALFABETO.charAt(randomInt(ALFABETO.length));
  return texto;
}

/** Usa crypto.randomInt (sin sesgo de módulo), no Math.random. */
export class GeneradorDeCodigosAleatorio implements GeneradorDeCodigos {
  codigoDeSala(): CodigoDeSala {
    return CodigoDeSala.crear(aleatorio(4));
  }

  codigoDeAcceso(): CodigoDeAcceso {
    return CodigoDeAcceso.crear(`${aleatorio(4)}-${aleatorio(4)}`);
  }
}
