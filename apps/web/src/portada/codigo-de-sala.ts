import { ALFABETO_DE_CODIGOS } from "@kuorum/domain";

export const LARGO_DE_CODIGO_DE_SALA = 4;

export const MENSAJE_DE_CARACTER_RECHAZADO =
  "Ese carácter no se usa en los códigos (no hay 0, 1, I, L ni O).";
export const MENSAJE_DE_CODIGO_INCOMPLETO = "El código tiene 4 caracteres.";

export interface CodigoEscrito {
  valor: string;
  /** Hubo caracteres fuera del alfabeto que se descartaron. */
  huboRechazados: boolean;
}

// Pasa a mayúsculas, descarta lo que no está en el alfabeto y corta en 4.
export function escribirCodigo(texto: string): CodigoEscrito {
  const mayusculas = texto.toUpperCase().replace(/[\s-]/g, "");
  let valor = "";
  let huboRechazados = false;
  for (const caracter of mayusculas) {
    if (ALFABETO_DE_CODIGOS.includes(caracter)) {
      if (valor.length < LARGO_DE_CODIGO_DE_SALA) valor += caracter;
    } else {
      huboRechazados = true;
    }
  }
  return { valor, huboRechazados };
}

export function rutaDeSala(codigo: string): string {
  return `/s/${codigo}`;
}
