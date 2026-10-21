"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  comoErrorDeMesa,
  type ClienteDeMesa,
  type ModoDeSala,
  type SesionDeLista,
} from "./cliente-de-mesa";

export const SEGUNDOS_POR_DEFECTO = 180;
const SEGUNDOS_MIN = 30;
const SEGUNDOS_MAX = 900;

export interface DatosDelFormulario {
  titulo: string;
  modo: ModoDeSala;
  segundos: number;
}

export interface Sesiones {
  sesiones: SesionDeLista[];
  cargando: boolean;
  error: string | undefined;
  recargar: () => Promise<void>;
  /** true si la sesión quedó creada. */
  crear: (datos: DatosDelFormulario) => Promise<boolean>;
  creando: boolean;
  errorDeCrear: string | undefined;
}

export function useSesiones(cliente: ClienteDeMesa): Sesiones {
  const [sesiones, setSesiones] = useState<SesionDeLista[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [creando, setCreando] = useState(false);
  const [errorDeCrear, setErrorDeCrear] = useState<string | undefined>(undefined);
  const enCurso = useRef(false);

  const recargar = useCallback(async () => {
    setError(undefined);
    try {
      const lista = await cliente.listarSesiones();
      setSesiones([...lista].sort((a, b) => Date.parse(b.creadaEn) - Date.parse(a.creadaEn)));
    } catch (causa) {
      setError(comoErrorDeMesa(causa).message);
    } finally {
      setCargando(false);
    }
  }, [cliente]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const crear = useCallback(
    async ({ titulo, modo, segundos }: DatosDelFormulario): Promise<boolean> => {
      if (enCurso.current) return false;
      const limpio = titulo.trim();
      if (limpio === "") {
        setErrorDeCrear("Escribe el título de la sesión.");
        return false;
      }
      if (!Number.isInteger(segundos) || segundos < SEGUNDOS_MIN || segundos > SEGUNDOS_MAX) {
        setErrorDeCrear(`Los segundos por intervención van de ${SEGUNDOS_MIN} a ${SEGUNDOS_MAX}.`);
        return false;
      }
      enCurso.current = true;
      setCreando(true);
      setErrorDeCrear(undefined);
      try {
        await cliente.crearSesion({ titulo: limpio, modo, segundosPorIntervencion: segundos });
        await recargar();
        return true;
      } catch (causa) {
        setErrorDeCrear(comoErrorDeMesa(causa).message);
        return false;
      } finally {
        enCurso.current = false;
        setCreando(false);
      }
    },
    [cliente, recargar],
  );

  return { sesiones, cargando, error, recargar, crear, creando, errorDeCrear };
}
