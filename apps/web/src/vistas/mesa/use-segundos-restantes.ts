"use client";

import type { EstadoDeSala } from "@kuorum/contracts";
import { useEffect, useMemo, useRef, useState } from "react";

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
  // El reloj puede cambiar de identidad entre renders (pruebas); se lee desde una ref.
  const relojActual = useRef(reloj);
  relojActual.current = reloj;
  const desfaseMs = useMemo(
    () => (estado === null ? 0 : Date.parse(estado.horaDelServidor) - relojActual.current()),
    // `reloj` es estable salvo en pruebas.
    [estado],
  );
  const [ahora, setAhora] = useState(() => relojActual.current());
  const orador = estado?.palabra.conLaPalabra ?? null;

  useEffect(() => {
    setAhora(relojActual.current());
  }, [estado]);

  const hayOrador = orador !== null;
  useEffect(() => {
    if (!hayOrador) return;
    const id = setInterval(() => setAhora(relojActual.current()), intervaloMs);
    return () => clearInterval(id);
  }, [hayOrador, intervaloMs]);

  if (orador === null) return null;
  const usadosMs = ahora + desfaseMs - Date.parse(orador.inicioEn);
  return Math.max(0, Math.ceil(orador.segundosTotales - usadosMs / 1000));
}
