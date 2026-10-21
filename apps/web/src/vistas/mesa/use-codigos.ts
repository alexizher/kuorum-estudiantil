"use client";

import { useCallback, useRef, useState } from "react";
import { comoErrorDeMesa, type ClienteDeMesa } from "./cliente-de-mesa";

export const CANTIDAD_MAXIMA_DE_CODIGOS = 2000;

export interface Codigos {
  /** El texto plano vive solo aquí, en memoria: ni almacenamiento ni URL. */
  codigos: string[] | null;
  generando: boolean;
  error: string | undefined;
  generar: (cantidad: number) => Promise<void>;
  descartar: () => void;
}

export function useCodigos(sesionId: string, cliente: ClienteDeMesa): Codigos {
  const [codigos, setCodigos] = useState<string[] | null>(null);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const enCurso = useRef(false);

  const generar = useCallback(
    async (cantidad: number) => {
      if (enCurso.current) return;
      if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > CANTIDAD_MAXIMA_DE_CODIGOS) {
        setError(`Escribe una cantidad entre 1 y ${CANTIDAD_MAXIMA_DE_CODIGOS}.`);
        return;
      }
      enCurso.current = true;
      setGenerando(true);
      setError(undefined);
      try {
        setCodigos(await cliente.generarCodigos(sesionId, cantidad));
      } catch (causa) {
        setError(comoErrorDeMesa(causa).message);
      } finally {
        enCurso.current = false;
        setGenerando(false);
      }
    },
    [cliente, sesionId],
  );

  return { codigos, generando, error, generar, descartar: () => setCodigos(null) };
}
