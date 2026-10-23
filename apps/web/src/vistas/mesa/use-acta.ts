"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { comoErrorDeMesa, type ActaDeMesa, type ClienteDeMesa } from "./cliente-de-mesa";

export interface ActaEnEdicion {
  acta: ActaDeMesa | undefined;
  cargando: boolean;
  desarrollo: string;
  escribir: (texto: string) => void;
  guardar: () => Promise<boolean>;
  /** Guarda el texto que se ve y finaliza. true si quedó final. */
  finalizar: () => Promise<boolean>;
  ocupado: boolean;
  guardado: boolean;
  error: string | undefined;
}

export function useActa(
  cliente: Pick<ClienteDeMesa, "leerActa" | "guardarActa" | "finalizarActa">,
  sesionId: string,
): ActaEnEdicion {
  const [acta, setActa] = useState<ActaDeMesa | undefined>(undefined);
  const [cargando, setCargando] = useState(true);
  const [desarrollo, setDesarrollo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const enCurso = useRef(false);

  // Con conservarTexto, un borrador mantiene lo que se está escribiendo.
  const cargar = useCallback(
    async (conservarTexto = false) => {
      try {
        const leida = await cliente.leerActa(sesionId);
        setActa(leida);
        if (!conservarTexto || leida.estado === "FINAL") setDesarrollo(leida.desarrollo);
      } catch (causa) {
        setError(comoErrorDeMesa(causa).message);
      } finally {
        setCargando(false);
      }
    },
    [cliente, sesionId],
  );

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const ejecutar = useCallback(
    async (accion: () => Promise<void>): Promise<boolean> => {
      if (enCurso.current) return false;
      enCurso.current = true;
      setOcupado(true);
      setError(undefined);
      try {
        await accion();
        return true;
      } catch (causa) {
        const error = comoErrorDeMesa(causa);
        setError(error.message);
        // Otra pestaña cambió el acta: se muestra como quedó.
        if (error.estado === 409) await cargar(true);
        return false;
      } finally {
        enCurso.current = false;
        setOcupado(false);
      }
    },
    [cargar],
  );

  const guardar = useCallback(async () => {
    const conExito = await ejecutar(() => cliente.guardarActa(sesionId, desarrollo));
    setGuardado(conExito);
    return conExito;
  }, [cliente, desarrollo, ejecutar, sesionId]);

  const finalizar = useCallback(
    () =>
      ejecutar(async () => {
        await cliente.guardarActa(sesionId, desarrollo);
        await cliente.finalizarActa(sesionId);
        setGuardado(false);
        await cargar();
      }),
    [cargar, cliente, desarrollo, ejecutar, sesionId],
  );

  return {
    acta,
    cargando,
    desarrollo,
    escribir: (texto) => {
      setDesarrollo(texto);
      setGuardado(false);
    },
    guardar,
    finalizar,
    ocupado,
    guardado,
    error,
  };
}
