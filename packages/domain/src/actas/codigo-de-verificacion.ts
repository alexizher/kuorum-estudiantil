import { ErrorDeDominio } from "../errores.js";
import { ALFABETO_DE_CODIGOS } from "../sesion/alfabeto-de-codigos.js";

const FORMATO = new RegExp(`^[${ALFABETO_DE_CODIGOS}]{10}$`);

/** Se muestra como XXXXX-XXXXX; es público por diseño. */
export class CodigoDeVerificacion {
  private constructor(readonly valor: string) {}

  static crear(valor: string): CodigoDeVerificacion {
    const limpio = valor.toUpperCase().replace(/[\s-]/g, "");
    if (!FORMATO.test(limpio)) {
      throw new ErrorDeDominio("CODIGO_DE_VERIFICACION_INVALIDO");
    }
    return new CodigoDeVerificacion(`${limpio.slice(0, 5)}-${limpio.slice(5)}`);
  }
}
