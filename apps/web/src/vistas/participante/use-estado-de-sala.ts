"use client";

import type { EstadoDeSala } from "@kuorum/contracts";
import { useEffect, useState } from "react";
import type { FuenteDeEstado } from "../../tiempo-real/fuente-de-estado";

const FALLOS_PARA_AVISAR = 3;
const ESTADOS_TERMINADOS: readonly EstadoDeSala["sala"]["estado"][] = [
  "CERRADA",
  "ACTA_FINAL",
  "CANCELADA",
];

export interface EstadoDeLaSala {
  estado: EstadoDeSala | null;
  /** false si la sala no existe (404) o ya terminó. */
  disponible: boolean;
  /** Tres consultas seguidas fallaron; se quita con la siguiente que responda. */
  sinConexion: boolean;
}

export function useEstadoDeSala(fuente: FuenteDeEstado, codigo: string): EstadoDeLaSala {
  const [estado, setEstado] = useState<EstadoDeSala | null>(null);
  const [noExiste, setNoExiste] = useState(false);
  const [fallos, setFallos] = useState(0);

  useEffect(() => {
    setEstado(null);
    setNoExiste(false);
    setFallos(0);
    return fuente.suscribir(
      codigo,
      setEstado,
      () => setNoExiste(true),
      (conExito) => setFallos((previos) => (conExito ? 0 : previos + 1)),
    );
  }, [fuente, codigo]);

  const terminada = estado !== null && ESTADOS_TERMINADOS.includes(estado.sala.estado);
  return {
    estado,
    disponible: !noExiste && !terminada,
    sinConexion: fallos >= FALLOS_PARA_AVISAR,
  };
}
