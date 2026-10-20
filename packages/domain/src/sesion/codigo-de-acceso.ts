import { ErrorDeDominio } from "../errores.js";
import { ALFABETO_DE_CODIGOS } from "./alfabeto-de-codigos.js";

const FORMATO = new RegExp(`^([${ALFABETO_DE_CODIGOS}]{4})-?([${ALFABETO_DE_CODIGOS}]{4})$`);

export class CodigoDeAcceso {
  private constructor(readonly valor: string) {}

  static crear(valor: string): CodigoDeAcceso {
    const coincidencia = FORMATO.exec(valor.toUpperCase());
    if (!coincidencia) {
      throw new ErrorDeDominio("CODIGO_DE_ACCESO_INVALIDO");
    }
    return new CodigoDeAcceso(`${coincidencia[1]}-${coincidencia[2]}`);
  }
}
