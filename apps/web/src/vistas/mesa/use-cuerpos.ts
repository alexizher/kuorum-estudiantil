"use client";

import { useEffect, useState } from "react";
import type { ClienteDeMesa, CuerpoDeMesa } from "./cliente-de-mesa";

export interface CuerposParaProgramar {
  /** Solo los cuerpos activos donde la cuenta puede programar. */
  cuerpos: CuerpoDeMesa[];
  cargando: boolean;
}

export function useCuerpos(cliente: Pick<ClienteDeMesa, "leerInstitucion">): CuerposParaProgramar {
  const [cuerpos, setCuerpos] = useState<CuerpoDeMesa[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vigente = true;
    cliente
      .leerInstitucion()
      .then(({ cuerpos: todos }) => {
        if (vigente) setCuerpos(todos.filter((c) => c.puedeProgramar));
      })
      .catch(() => {
        if (vigente) setCuerpos([]);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [cliente]);

  return { cuerpos, cargando };
}
