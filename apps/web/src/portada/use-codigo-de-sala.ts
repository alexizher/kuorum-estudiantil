"use client";

import { useState } from "react";
import {
  LARGO_DE_CODIGO_DE_SALA,
  MENSAJE_DE_CARACTER_RECHAZADO,
  MENSAJE_DE_CODIGO_INCOMPLETO,
  escribirCodigo,
  rutaDeSala,
} from "./codigo-de-sala";

// La lógica del campo vive aquí; la navegación llega por parámetro.
export function useCodigoDeSala(irA: (ruta: string) => void) {
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  function escribir(texto: string): void {
    const { valor, huboRechazados } = escribirCodigo(texto);
    setCodigo(valor);
    setError(huboRechazados ? MENSAJE_DE_CARACTER_RECHAZADO : undefined);
  }

  function entrar(): void {
    if (codigo.length !== LARGO_DE_CODIGO_DE_SALA) {
      setError(MENSAJE_DE_CODIGO_INCOMPLETO);
      return;
    }
    irA(rutaDeSala(codigo));
  }

  return { codigo, error, escribir, entrar };
}
