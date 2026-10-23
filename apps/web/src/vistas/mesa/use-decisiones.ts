"use client";

import { useCallback, useEffect, useState } from "react";
import { comoErrorDeMesa, type ClienteDeMesa, type DecisionDeMesa } from "./cliente-de-mesa";

export interface Decisiones {
  decisiones: readonly DecisionDeMesa[];
  /** Devuelve el mensaje de error, o undefined si quedó guardado. */
  guardarEnunciado: (decisionId: string, enunciado: string) => Promise<string | undefined>;
}

/**
 * Las decisiones de la sesión. Solo existen cuando hay votaciones cerradas: `cerradas` cambia
 * cada vez que se cierra una y vuelve a pedirlas.
 */
export function useDecisiones(
  cliente: Pick<ClienteDeMesa, "listarDecisiones" | "editarEnunciado">,
  sesionId: string,
  cerradas: number,
): Decisiones {
  const [decisiones, setDecisiones] = useState<readonly DecisionDeMesa[]>([]);

  useEffect(() => {
    if (cerradas === 0) return;
    let vigente = true;
    cliente
      .listarDecisiones(sesionId)
      .then((lista) => {
        if (vigente) setDecisiones(lista);
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [cliente, sesionId, cerradas]);

  const guardarEnunciado = useCallback(
    async (decisionId: string, enunciado: string): Promise<string | undefined> => {
      const limpio = enunciado.trim();
      try {
        await cliente.editarEnunciado(decisionId, limpio === "" ? null : limpio);
        setDecisiones((actuales) =>
          actuales.map((d) =>
            d.id === decisionId ? { ...d, enunciado: limpio === "" ? null : limpio } : d,
          ),
        );
        return undefined;
      } catch (causa) {
        return comoErrorDeMesa(causa).message;
      }
    },
    [cliente],
  );

  return { decisiones, guardarEnunciado };
}
