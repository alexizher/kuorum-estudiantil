"use client";

import type { EstadoDeSala } from "@kuorum/contracts";
import { useEffect, useMemo, useState } from "react";

export interface OpcionesDeSegundos {
  /** Milisegundos locales; se inyecta en las pruebas. */
  reloj?: () => number;
  intervaloMs?: number;
}

const INTERVALO_MS = 250;

/** Segundos que le quedan a quien habla, con la hora del servidor como referencia. Null sin orador. */
export function useSegundosRestantes(
  estado: EstadoDeSala | null,
  { reloj = Date.now, intervaloMs = INTERVALO_MS }: OpcionesDeSegundos = {},
): number | null {
  const desfaseMs = useMemo(
    () => (estado === null ? 0 : Date.parse(estado.horaDelServidor) - reloj()),
    // `reloj` es estable salvo en pruebas.
    [estado],
  );
  const [ahora, setAhora] = useState(() => reloj());
  const orador = estado?.palabra.conLaPalabra ?? null;

  useEffect(() => {
    setAhora(reloj());
  }, [estado]);

  const hayOrador = orador !== null;
  useEffect(() => {
    if (!hayOrador) return;
    const id = setInterval(() => setAhora(reloj()), intervaloMs);
    return () => clearInterval(id);
  }, [hayOrador, intervaloMs]);

  if (orador === null) return null;
  const usadosMs = ahora + desfaseMs - Date.parse(orador.inicioEn);
  return Math.max(0, Math.ceil(orador.segundosTotales - usadosMs / 1000));
}
