import { ErrorDeDominio } from "../src/index.js";

export function codigoDeError(operacion: () => unknown): string {
  try {
    operacion();
  } catch (error) {
    if (error instanceof ErrorDeDominio) return error.codigo;
    throw error;
  }
  throw new Error("La operación no lanzó error");
}
