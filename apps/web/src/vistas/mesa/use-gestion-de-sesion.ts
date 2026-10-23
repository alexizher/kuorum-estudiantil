"use client";

import { useCallback, useRef, useState } from "react";
import { comoErrorDeMesa, type CambiosDeSesion, type ClienteDeMesa } from "./cliente-de-mesa";

export interface GestionDeSesion {
  /** true si quedó guardada. */
  reprogramar: (cambios: CambiosDeSesion) => Promise<boolean>;
  cancelar: () => Promise<boolean>;
  ocupado: boolean;
  error: string | undefined;
  descartarError: () => void;
}

/** Reprogramar y cancelar. Tras cada cambio, `alCambiar` trae de nuevo los datos del servidor. */
export function useGestionDeSesion(
  cliente: Pick<ClienteDeMesa, "reprogramar" | "cancelar">,
  sesionId: string,
  alCambiar: () => void,
): GestionDeSesion {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const enCurso = useRef(false);

  const ejecutar = useCallback(
    async (accion: () => Promise<void>): Promise<boolean> => {
      if (enCurso.current) return false;
      enCurso.current = true;
      setOcupado(true);
      setError(undefined);
      try {
        await accion();
        alCambiar();
        return true;
      } catch (causa) {
        setError(comoErrorDeMesa(causa).message);
        return false;
      } finally {
        enCurso.current = false;
        setOcupado(false);
      }
    },
    [alCambiar],
  );

  return {
    reprogramar: (cambios) => ejecutar(() => cliente.reprogramar(sesionId, cambios)),
    cancelar: () => ejecutar(() => cliente.cancelar(sesionId)),
    ocupado,
    error,
    descartarError: () => setError(undefined),
  };
}
