"use client";

import { useEffect, useRef, useState } from "react";
import type { ClienteDeMesa, CruceDeSesion } from "./cliente-de-mesa";

const ESPERA_MS = 400;

export interface Tramo {
  inicio: string;
  fin: string;
  /** La sesión que se reprograma, para que no choque consigo misma. */
  excluir?: string;
}

/**
 * Sesiones que chocan con el tramo mientras se escribe. Espera a que se deje de teclear y
 * descarta respuestas que llegan tarde. Solo avisa: nunca bloquea el guardado.
 */
export function useCruces(
  cliente: Pick<ClienteDeMesa, "buscarCruces">,
  { inicio, fin, excluir }: Tramo,
): { cruces: CruceDeSesion[] } {
  const [cruces, setCruces] = useState<CruceDeSesion[]>([]);
  const consulta = useRef(0);

  useEffect(() => {
    const numero = ++consulta.current;
    if (inicio === "" || fin === "") {
      setCruces([]);
      return;
    }
    const espera = setTimeout(() => {
      cliente
        .buscarCruces({ inicio, fin, ...(excluir === undefined ? {} : { excluir }) })
        .then((encontrados) => {
          if (numero === consulta.current) setCruces(encontrados);
        })
        .catch(() => {
          if (numero === consulta.current) setCruces([]);
        });
    }, ESPERA_MS);
    return () => clearTimeout(espera);
  }, [cliente, inicio, fin, excluir]);

  return { cruces };
}
