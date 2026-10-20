import { ErrorDeDominio } from "../errores.js";
import { ALFABETO_DE_CODIGOS } from "./alfabeto-de-codigos.js";

const FORMATO = new RegExp(`^[${ALFABETO_DE_CODIGOS}]{4}$`);

export class CodigoDeSala {
  private constructor(readonly valor: string) {}

  static crear(valor: string): CodigoDeSala {
    const normalizado = valor.toUpperCase();
    if (!FORMATO.test(normalizado)) {
      throw new ErrorDeDominio("CODIGO_DE_SALA_INVALIDO");
    }
    return new CodigoDeSala(normalizado);
  }
}
