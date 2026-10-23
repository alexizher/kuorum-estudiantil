"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  comoErrorDeMesa,
  type ClienteDeMesa,
  type Modalidad,
  type ModoDeSala,
  type SesionDeLista,
} from "./cliente-de-mesa";
import { finLocal } from "./horario";

export const SEGUNDOS_POR_DEFECTO = 180;
const SEGUNDOS_MIN = 30;
const SEGUNDOS_MAX = 900;

export interface DatosDelFormulario {
  titulo: string;
  modo: ModoDeSala;
  segundos: number;
  cuerpoId: string;
  /** `2026-11-03`; las horas en `14:00`. Si `hasta` no pasa de `desde`, termina al día siguiente. */
  fecha: string;
  desde: string;
  hasta: string;
  modalidad: Modalidad;
  lugar: string;
  ordenDelDia?: string[];
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

export function useSesiones(cliente: ClienteDeMesa, incluirCuentaDePrueba = false): Sesiones {
  const [sesiones, setSesiones] = useState<SesionDeLista[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [creando, setCreando] = useState(false);
  const [errorDeCrear, setErrorDeCrear] = useState<string | undefined>(undefined);
  const enCurso = useRef(false);

  const recargar = useCallback(async () => {
    setError(undefined);
    try {
      const lista = await cliente.listarSesiones({ incluirCuentaDePrueba });
      setSesiones([...lista].sort((a, b) => Date.parse(b.inicio) - Date.parse(a.inicio)));
    } catch (causa) {
      setError(comoErrorDeMesa(causa).message);
    } finally {
      setCargando(false);
    }
  }, [cliente, incluirCuentaDePrueba]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const crear = useCallback(
    async (datos: DatosDelFormulario): Promise<boolean> => {
      if (enCurso.current) return false;
      const { segundos } = datos;
      const limpio = datos.titulo.trim();
      const lugar = datos.lugar.trim();
      if (limpio === "") {
        setErrorDeCrear("Escribe el título de la sesión.");
        return false;
      }
      if (datos.cuerpoId === "") {
        setErrorDeCrear("Elige el cuerpo de la sesión.");
        return false;
      }
      if (datos.fecha === "" || datos.desde === "" || datos.hasta === "") {
        setErrorDeCrear("Escribe la fecha y las horas de la sesión.");
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
        await cliente.crearSesion({
          titulo: limpio,
          modo: datos.modo,
          segundosPorIntervencion: segundos,
          cuerpoId: datos.cuerpoId,
          inicio: `${datos.fecha}T${datos.desde}`,
          fin: finLocal(datos.fecha, datos.desde, datos.hasta),
          modalidad: datos.modalidad,
          ...(lugar === "" ? {} : { lugar }),
          ...(datos.ordenDelDia === undefined || datos.ordenDelDia.length === 0
            ? {}
            : { ordenDelDia: datos.ordenDelDia }),
        });
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
