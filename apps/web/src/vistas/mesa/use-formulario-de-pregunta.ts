"use client";

import { useState } from "react";

export const OPCIONES_MIN = 2;
export const OPCIONES_MAX = 10;
const TEXTO_MIN = 5;
const TEXTO_MAX = 300;

export interface FormularioDePregunta {
  texto: string;
  plantilla: boolean;
  opciones: string[];
  error: string | undefined;
  escribirTexto: (texto: string) => void;
  elegirPlantilla: (plantilla: boolean) => void;
  escribirOpcion: (indice: number, texto: string) => void;
  agregarOpcion: () => void;
  quitarOpcion: (indice: number) => void;
  enviar: () => Promise<void>;
}

/** `crear` devuelve true si la pregunta quedó creada. */
export function useFormularioDePregunta(
  crear: (texto: string, opciones?: string[]) => Promise<boolean>,
): FormularioDePregunta {
  const [texto, setTexto] = useState("");
  const [plantilla, setPlantilla] = useState(true);
  const [opciones, setOpciones] = useState<string[]>(["", ""]);
  const [error, setError] = useState<string | undefined>(undefined);

  function validar(): string | undefined {
    const largo = texto.trim().length;
    if (largo < TEXTO_MIN || largo > TEXTO_MAX) {
      return `La pregunta debe tener entre ${TEXTO_MIN} y ${TEXTO_MAX} caracteres.`;
    }
    if (plantilla) return undefined;
    const limpias = opciones.map((o) => o.trim()).filter((o) => o !== "");
    if (limpias.length < OPCIONES_MIN) return "Escribe al menos dos opciones.";
    if (new Set(limpias.map((o) => o.toLowerCase())).size !== limpias.length) {
      return "Las opciones no pueden repetirse.";
    }
    return undefined;
  }

  async function enviar(): Promise<void> {
    const problema = validar();
    setError(problema);
    if (problema !== undefined) return;
    const propias = plantilla ? undefined : opciones.map((o) => o.trim()).filter((o) => o !== "");
    if (await crear(texto.trim(), propias)) {
      setTexto("");
      setOpciones(["", ""]);
      setPlantilla(true);
    }
  }

  return {
    texto,
    plantilla,
    opciones,
    error,
    escribirTexto: (valor) => {
      setTexto(valor);
      setError(undefined);
    },
    elegirPlantilla: (valor) => {
      setPlantilla(valor);
      setError(undefined);
    },
    escribirOpcion: (indice, valor) =>
      setOpciones((previas) => previas.map((o, i) => (i === indice ? valor : o))),
    agregarOpcion: () =>
      setOpciones((previas) => (previas.length < OPCIONES_MAX ? [...previas, ""] : previas)),
    quitarOpcion: (indice) =>
      setOpciones((previas) =>
        previas.length > OPCIONES_MIN ? previas.filter((_, i) => i !== indice) : previas,
      ),
    enviar,
  };
}
