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
  /** Tres consultas seguidas fallaron; se quita con la siguiente que responda. */
  sinConexion: boolean;
}

export interface OpcionesDeProyeccion {
  /** Milisegundos locales; se inyecta en las pruebas. */
  reloj?: () => number;
  intervaloMs?: number;
}

const INTERVALO_DEL_CRONOMETRO_MS = 250;
const FALLOS_PARA_AVISAR = 3;

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
  const [fallos, setFallos] = useState(0);
  const [ahora, setAhora] = useState(() => reloj());

  useEffect(() => {
    setRecibido(null);
    setNoDisponible(false);
    setFallos(0);
    return fuente.suscribir(
      codigo,
      (estado) => {
        const local = reloj();
        setRecibido({ estado, desfaseMs: Date.parse(estado.horaDelServidor) - local });
        setAhora(local);
      },
      () => setNoDisponible(true),
      (conExito) => setFallos((previos) => (conExito ? 0 : previos + 1)),
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

  const sinConexion = fallos >= FALLOS_PARA_AVISAR;
  if (noDisponible) return { vista: "no-disponible", segundosRestantes: null, sinConexion: false };
  if (!recibido || !vista) return { vista: "cargando", segundosRestantes: null, sinConexion };
  return {
    sinConexion,
    vista,
    estado: recibido.estado,
    segundosRestantes: hayCronometro ? segundosQueQuedan(recibido, ahora) : null,
  };
}
