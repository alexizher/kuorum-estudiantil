"use client";

import { useCallback, useRef, useState } from "react";
import { comoErrorDeMesa, type ClienteDeMesa } from "./cliente-de-mesa";

export const TAMANO_DE_LOTE = 50;

export interface Entrega {
  /** El código que se está entregando; null antes del primero. Solo en memoria. */
  actual: string | null;
  /** Códigos mostrados en esta pantalla. */
  entregados: number;
  cargando: boolean;
  error: string | undefined;
  /** Muestra el siguiente código; pide otro lote al servidor cuando se acaba el actual. */
  siguiente: () => Promise<void>;
}

export function useEntrega(sesionId: string, cliente: ClienteDeMesa): Entrega {
  const [actual, setActual] = useState<string | null>(null);
  const [entregados, setEntregados] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const lote = useRef<string[]>([]);
  const enCurso = useRef(false);

  const siguiente = useCallback(async () => {
    if (enCurso.current) return;
    enCurso.current = true;
    setError(undefined);
    try {
      if (lote.current.length === 0) {
        setCargando(true);
        lote.current = [...(await cliente.generarCodigos(sesionId, TAMANO_DE_LOTE))];
      }
      const codigo = lote.current.shift();
      if (codigo !== undefined) {
        setActual(codigo);
        setEntregados((previos) => previos + 1);
      }
    } catch (causa) {
      setError(comoErrorDeMesa(causa).message);
    } finally {
      enCurso.current = false;
      setCargando(false);
    }
  }, [cliente, sesionId]);

  return { actual, entregados, cargando, error, siguiente };
}
