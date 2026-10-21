"use client";

import type { EstadoDeSala } from "@kuorum/contracts";
import { useCallback, useRef, useState } from "react";
import { escribirLista, leerLista, type Almacen } from "./almacen";
import { comoErrorDeAccion, type ClienteDeSala } from "./cliente-de-sala";

type Pregunta = NonNullable<EstadoDeSala["pregunta"]>;

export interface OpcionesDeVotacion {
  almacen: Almacen;
  alPerderIngreso: () => void;
}

export interface Votacion {
  /** La pregunta abierta, o null si no hay votación en curso. */
  abierta: Pregunta | null;
  yaVoto: boolean;
  elegida: string | null;
  elegir: (opcionId: string) => void;
  votar: () => Promise<void>;
  enviando: boolean;
  error: string | undefined;
}

export function useVotacion(
  codigo: string,
  pregunta: Pregunta | null,
  cliente: ClienteDeSala,
  { almacen, alPerderIngreso }: OpcionesDeVotacion,
): Votacion {
  const clave = `kuorum-votadas-${codigo}`;
  const [votadas, setVotadas] = useState(() => leerLista(almacen, clave));
  const [eleccion, setEleccion] = useState<{ preguntaId: string; opcionId: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const enCurso = useRef(false);

  const abierta = pregunta !== null && pregunta.estado === "ABIERTA" ? pregunta : null;
  const yaVoto = abierta !== null && votadas.includes(abierta.id);
  // La elección es de una pregunta; si cambia la pregunta, se empieza sin elegir.
  const elegida =
    abierta !== null && eleccion?.preguntaId === abierta.id ? eleccion.opcionId : null;

  const elegir = useCallback(
    (opcionId: string) => {
      if (abierta === null) return;
      setEleccion({ preguntaId: abierta.id, opcionId });
      setError(undefined);
    },
    [abierta],
  );

  const votar = useCallback(async (): Promise<void> => {
    if (abierta === null || enCurso.current) return;
    if (elegida === null) {
      setError("Elige una opción antes de votar.");
      return;
    }
    const preguntaId = abierta.id;
    const recordar = () =>
      setVotadas((previas) => {
        if (previas.includes(preguntaId)) return previas;
        const nuevas = [...previas, preguntaId];
        escribirLista(almacen, clave, nuevas);
        return nuevas;
      });
    enCurso.current = true;
    setEnviando(true);
    setError(undefined);
    try {
      await cliente.votar(codigo, preguntaId, elegida);
      recordar();
    } catch (causa) {
      const fallo = comoErrorDeAccion(causa);
      if (fallo.codigo === "YA_VOTO") recordar();
      else if (fallo.codigo === "SIN_INGRESO") alPerderIngreso();
      else setError(fallo.message);
    } finally {
      enCurso.current = false;
      setEnviando(false);
    }
  }, [abierta, almacen, alPerderIngreso, clave, cliente, codigo, elegida]);

  return { abierta, yaVoto, elegida, elegir, votar, enviando, error };
}
