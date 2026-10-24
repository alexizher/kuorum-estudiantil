"use client";

import type { EstadoDeSala } from "@kuorum/contracts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FuenteRefrescable } from "@/tiempo-real/fuente-de-estado";
import { hayMasVotosQueCodigos } from "./alerta";
import {
  comoErrorDeMesa,
  type ClienteDeMesa,
  type PreguntaDeMesa,
  type ResultadoDeVotacion,
} from "./cliente-de-mesa";

const FALLOS_PARA_AVISAR = 3;

export interface ErrorDelPanel {
  codigo: string;
  mensaje: string;
}

export interface AccionesDelPanel {
  iniciar: () => Promise<boolean>;
  terminar: () => Promise<boolean>;
  crearPregunta: (texto: string, opciones?: string[]) => Promise<boolean>;
  abrir: (preguntaId: string) => Promise<boolean>;
  cerrar: (preguntaId: string) => Promise<boolean>;
  anular: (preguntaId: string) => Promise<boolean>;
  proyectar: (preguntaId: string) => Promise<boolean>;
  /** Sin solicitud da la palabra a la siguiente de la fila. */
  darLaPalabra: (solicitudId?: string) => Promise<boolean>;
  terminarIntervencion: () => Promise<boolean>;
  sumarMinuto: () => Promise<boolean>;
  rechazarMocion: (solicitudId: string) => Promise<boolean>;
}

export interface PanelDeSesion {
  estado: EstadoDeSala | null;
  /** false si la sala no existe (404). */
  disponible: boolean;
  /** Tres consultas seguidas fallaron; se quita con la siguiente que responda. */
  sinConexion: boolean;
  preguntas: PreguntaDeMesa[];
  /** Hay más votos que códigos activados. */
  alerta: boolean;
  ocupado: boolean;
  error: ErrorDelPanel | undefined;
  /** Repite la última acción que falló (por ejemplo CIERRE_OCUPADO). */
  reintentar: () => Promise<boolean>;
  descartarError: () => void;
  acciones: AccionesDelPanel;
}

export function usePanelDeSesion(
  sesion: { id: string; codigo: string },
  fuente: FuenteRefrescable,
  cliente: ClienteDeMesa,
): PanelDeSesion {
  const [estado, setEstado] = useState<EstadoDeSala | null>(null);
  const [noExiste, setNoExiste] = useState(false);
  const [fallos, setFallos] = useState(0);
  const [listadas, setPreguntas] = useState<PreguntaDeMesa[]>([]);
  const [alCerrar, setAlCerrar] = useState<Record<string, ResultadoDeVotacion>>({});
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<ErrorDelPanel | undefined>(undefined);
  const enCurso = useRef(false);
  const ultima = useRef<(() => Promise<void>) | null>(null);

  const cargarPreguntas = useCallback(async () => {
    try {
      setPreguntas(await cliente.listarPreguntas(sesion.id));
    } catch {
      // El siguiente cambio de versión lo vuelve a intentar.
    }
  }, [cliente, sesion.id]);

  useEffect(() => {
    setEstado(null);
    setNoExiste(false);
    setFallos(0);
    return fuente.suscribir(
      sesion.codigo,
      setEstado,
      () => setNoExiste(true),
      (conExito) => setFallos((previos) => (conExito ? 0 : previos + 1)),
    );
  }, [fuente, sesion.codigo]);

  const version = estado?.version;
  useEffect(() => {
    void cargarPreguntas();
  }, [cargarPreguntas, version]);

  const ejecutar = useCallback(
    async (trabajo: () => Promise<void>): Promise<boolean> => {
      if (enCurso.current) return false;
      enCurso.current = true;
      ultima.current = trabajo;
      setOcupado(true);
      setError(undefined);
      try {
        await trabajo();
        await cargarPreguntas();
        fuente.refrescar();
        return true;
      } catch (causa) {
        const fallo = comoErrorDeMesa(causa);
        setError({ codigo: fallo.codigo, mensaje: fallo.message });
        return false;
      } finally {
        enCurso.current = false;
        setOcupado(false);
      }
    },
    [cargarPreguntas, fuente],
  );

  const acciones = useMemo<AccionesDelPanel>(
    () => ({
      iniciar: () => ejecutar(() => cliente.iniciar(sesion.id)),
      terminar: () => ejecutar(() => cliente.terminar(sesion.id)),
      crearPregunta: (texto, opciones) =>
        ejecutar(() => cliente.crearPregunta(sesion.id, texto, opciones)),
      abrir: (id) => ejecutar(() => cliente.abrirPregunta(id)),
      cerrar: (id) =>
        ejecutar(async () => {
          const resultado = await cliente.cerrarPregunta(id);
          setAlCerrar((previos) => ({ ...previos, [id]: resultado }));
        }),
      anular: (id) => ejecutar(() => cliente.anularPregunta(id)),
      proyectar: (id) => ejecutar(() => cliente.proyectarPregunta(id)),
      darLaPalabra: (solicitudId) => ejecutar(() => cliente.darLaPalabra(sesion.id, solicitudId)),
      terminarIntervencion: () => ejecutar(() => cliente.terminarIntervencion(sesion.id)),
      sumarMinuto: () => ejecutar(() => cliente.sumarMinuto(sesion.id)),
      rechazarMocion: (solicitudId) =>
        ejecutar(() => cliente.rechazarMocion(sesion.id, solicitudId)),
    }),
    [cliente, ejecutar, sesion.id],
  );

  const reintentar = useCallback(
    async () => (ultima.current === null ? false : ejecutar(ultima.current)),
    [ejecutar],
  );

  // El resultado de la respuesta al cerrar cubre el hueco hasta que el listado lo traiga.
  const preguntas = useMemo(
    () => listadas.map((p) => ({ ...p, resultado: p.resultado ?? alCerrar[p.id] ?? null })),
    [listadas, alCerrar],
  );

  return {
    estado,
    disponible: !noExiste,
    sinConexion: fallos >= FALLOS_PARA_AVISAR,
    preguntas,
    alerta: hayMasVotosQueCodigos(estado),
    ocupado,
    error,
    reintentar,
    descartarError: () => setError(undefined),
    acciones,
  };
}
