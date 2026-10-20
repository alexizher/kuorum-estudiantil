"use client";

import type { EstadoDeSala } from "@kuorum/contracts";
import { useEffect, useState } from "react";
import type { FuenteDeEstado } from "../../tiempo-real/fuente-de-estado";
import { elegirVista, type VistaDeProyeccion } from "./elegir-vista";

export type VistaConCarga = "cargando" | "no-disponible" | VistaDeProyeccion;

export interface Proyeccion {
  vista: VistaConCarga;
  estado?: EstadoDeSala;
  /** Solo en la vista de palabra. */
  segundosRestantes: number | null;
}

export interface OpcionesDeProyeccion {
  /** Milisegundos locales; se inyecta en las pruebas. */
  reloj?: () => number;
  intervaloMs?: number;
}

const INTERVALO_DEL_CRONOMETRO_MS = 250;

interface Recibido {
  estado: EstadoDeSala;
  /** Hora del servidor menos hora local cuando llegó el estado. */
  desfaseMs: number;
}

function segundosQueQuedan(recibido: Recibido, ahoraLocalMs: number): number | null {
  const orador = recibido.estado.palabra.conLaPalabra;
  if (orador === null) return null;
  const ahoraDelServidor = ahoraLocalMs + recibido.desfaseMs;
  const usadosMs = ahoraDelServidor - Date.parse(orador.inicioEn);
  return Math.max(0, Math.ceil(orador.segundosTotales - usadosMs / 1000));
}

export function useProyeccion(
  fuente: FuenteDeEstado,
  codigo: string,
  { reloj = Date.now, intervaloMs = INTERVALO_DEL_CRONOMETRO_MS }: OpcionesDeProyeccion = {},
): Proyeccion {
  const [recibido, setRecibido] = useState<Recibido | null>(null);
  const [noDisponible, setNoDisponible] = useState(false);
  const [ahora, setAhora] = useState(() => reloj());

  useEffect(() => {
    setRecibido(null);
    setNoDisponible(false);
    return fuente.suscribir(
      codigo,
      (estado) => {
        const local = reloj();
        setRecibido({ estado, desfaseMs: Date.parse(estado.horaDelServidor) - local });
        setAhora(local);
      },
      () => setNoDisponible(true),
    );
    // `reloj` es estable salvo en pruebas; no debe reiniciar la suscripción.
  }, [fuente, codigo]);

  const vista = recibido ? elegirVista(recibido.estado) : null;
  const hayCronometro = vista === "palabra";

  useEffect(() => {
    if (!hayCronometro) return;
    const id = setInterval(() => setAhora(reloj()), intervaloMs);
    return () => clearInterval(id);
  }, [hayCronometro, intervaloMs]);

  if (noDisponible) return { vista: "no-disponible", segundosRestantes: null };
  if (!recibido || !vista) return { vista: "cargando", segundosRestantes: null };
  return {
    vista,
    estado: recibido.estado,
    segundosRestantes: hayCronometro ? segundosQueQuedan(recibido, ahora) : null,
  };
}
