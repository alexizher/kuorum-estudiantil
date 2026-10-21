"use client";

import type { EstadoDeSala } from "@kuorum/contracts";
import type { TipoDeMocion } from "@kuorum/domain";
import { useCallback, useEffect, useRef, useState } from "react";
import { escribirLista, leerLista, type Almacen } from "./almacen";
import { comoErrorDeAccion, type ClienteDeSala } from "./cliente-de-sala";

type Solicitud = EstadoDeSala["palabra"]["fila"][number];

export interface OpcionesDePalabra {
  almacen: Almacen;
  alPerderIngreso: () => void;
}

/** pendiente: se pidió y todavía no aparece en el estado público. */
export type SituacionDelTurno = "pendiente" | "en-fila" | "con-la-palabra";

export interface Turno {
  id: string;
  tipo: Solicitud["tipo"];
  mocion: TipoDeMocion | null;
  situacion: SituacionDelTurno;
  /** Desde 1. Solo con situacion "en-fila". */
  lugar: number | null;
  /** Personas en la fila ahora. */
  total: number;
}

export interface Palabra {
  nombre: string;
  /** Ya se pidió una vez: no hace falta volver a preguntarlo. */
  nombreRecordado: boolean;
  escribirNombre: (texto: string) => void;
  turnos: Turno[];
  /** Tiene algún turno pendiente, en la fila o hablando. */
  enFila: boolean;
  tieneIntervencion: boolean;
  tieneMocion: boolean;
  pedirPalabra: () => Promise<boolean>;
  presentarMocion: (tipo: TipoDeMocion) => Promise<boolean>;
  retirar: (solicitudId: string) => Promise<boolean>;
  ocupado: boolean;
  error: string | undefined;
}

interface Pendiente {
  id: string;
  tipo: Solicitud["tipo"];
  mocion: TipoDeMocion | null;
  versionAlPedir: number;
  /** Estados más nuevos que el de entonces en los que todavía no aparece. */
  sinVerse: number;
}

/** Con dos estados nuevos sin verla, la solicitud ya no está (la atendieron o la rechazaron). */
const ESTADOS_PARA_DAR_POR_PERDIDA = 2;
const SIN_NOMBRE = "Escribe cómo quieres que te anuncien.";

function lugarDe(estado: EstadoDeSala | null, id: string) {
  if (estado === null) return null;
  const { conLaPalabra, fila } = estado.palabra;
  if (conLaPalabra?.id === id) return { solicitud: conLaPalabra as Solicitud, indice: -1 };
  const indice = fila.findIndex((s) => s.id === id);
  const solicitud = fila[indice];
  return solicitud === undefined ? null : { solicitud, indice };
}

export function usePalabra(
  codigo: string,
  estado: EstadoDeSala | null,
  cliente: ClienteDeSala,
  { almacen, alPerderIngreso }: OpcionesDePalabra,
): Palabra {
  const claveDelNombre = "kuorum-nombre";
  const claveDeSolicitudes = `kuorum-solicitudes-${codigo}`;
  const [guardado] = useState(() => almacen.leer(claveDelNombre)?.trim() ?? "");
  const [nombre, setNombre] = useState(guardado);
  const [nombreRecordado, setNombreRecordado] = useState(guardado !== "");
  const [ids, setIds] = useState(() => leerLista(almacen, claveDeSolicitudes));
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const enCurso = useRef(false);
  const versionActual = useRef(0);
  versionActual.current = estado?.version ?? 0;

  const guardarIds = useCallback(
    (cambiar: (previos: string[]) => string[]) =>
      setIds((previos) => {
        const nuevos = cambiar(previos);
        escribirLista(almacen, claveDeSolicitudes, nuevos);
        return nuevos;
      }),
    [almacen, claveDeSolicitudes],
  );

  // Quita las pendientes que ya aparecen o que dejaron de esperarse.
  useEffect(() => {
    if (estado === null || pendientes.length === 0) return;
    const perdidas: string[] = [];
    const quedan: Pendiente[] = [];
    for (const pendiente of pendientes) {
      if (lugarDe(estado, pendiente.id) !== null) continue;
      if (estado.version <= pendiente.versionAlPedir) {
        quedan.push(pendiente);
        continue;
      }
      const sinVerse = pendiente.sinVerse + 1;
      if (sinVerse >= ESTADOS_PARA_DAR_POR_PERDIDA) perdidas.push(pendiente.id);
      else quedan.push({ ...pendiente, sinVerse });
    }
    if (perdidas.length > 0)
      guardarIds((previos) => previos.filter((id) => !perdidas.includes(id)));
    if (
      quedan.length !== pendientes.length ||
      perdidas.length > 0 ||
      quedan.some((q, i) => q !== pendientes[i])
    ) {
      setPendientes(quedan);
    }
    // Solo cuando llega un estado nuevo.
  }, [estado?.version]);

  const turnos: Turno[] = [];
  for (const id of ids) {
    const total = estado?.palabra.fila.length ?? 0;
    const hallado = lugarDe(estado, id);
    if (hallado !== null) {
      const { solicitud, indice } = hallado;
      turnos.push({
        id,
        tipo: solicitud.tipo,
        mocion: solicitud.mocion,
        situacion: indice === -1 ? "con-la-palabra" : "en-fila",
        lugar: indice === -1 ? null : indice + 1,
        total,
      });
      continue;
    }
    const pendiente = pendientes.find((p) => p.id === id);
    if (pendiente !== undefined) {
      turnos.push({
        id,
        tipo: pendiente.tipo,
        mocion: pendiente.mocion,
        situacion: "pendiente",
        lugar: null,
        total,
      });
    }
  }

  const recordarNombre = (limpio: string) => {
    almacen.escribir(claveDelNombre, limpio);
    setNombreRecordado(true);
  };

  const solicitar = useCallback(
    async (
      pedir: (limpio: string) => Promise<string>,
      tipo: Solicitud["tipo"],
      mocion: TipoDeMocion | null,
    ): Promise<boolean> => {
      if (enCurso.current) return false;
      const limpio = nombre.trim();
      if (limpio === "") {
        setError(SIN_NOMBRE);
        return false;
      }
      enCurso.current = true;
      setOcupado(true);
      setError(undefined);
      try {
        const id = await pedir(limpio);
        recordarNombre(limpio);
        guardarIds((previos) => [...previos, id]);
        setPendientes((previas) => [
          ...previas,
          { id, tipo, mocion, versionAlPedir: versionActual.current, sinVerse: 0 },
        ]);
        return true;
      } catch (causa) {
        const fallo = comoErrorDeAccion(causa);
        if (fallo.codigo === "SIN_INGRESO") alPerderIngreso();
        else setError(fallo.message);
        return false;
      } finally {
        enCurso.current = false;
        setOcupado(false);
      }
    },
    // recordarNombre solo usa valores estables
    [nombre, guardarIds, alPerderIngreso],
  );

  const pedirPalabra = useCallback(
    () => solicitar((limpio) => cliente.pedirPalabra(codigo, limpio), "INTERVENCION", null),
    [cliente, codigo, solicitar],
  );

  const presentarMocion = useCallback(
    (tipo: TipoDeMocion) =>
      solicitar((limpio) => cliente.presentarMocion(codigo, limpio, tipo), "MOCION", tipo),
    [cliente, codigo, solicitar],
  );

  const retirar = useCallback(
    async (solicitudId: string): Promise<boolean> => {
      if (enCurso.current) return false;
      enCurso.current = true;
      setOcupado(true);
      setError(undefined);
      try {
        await cliente.retirar(codigo, solicitudId);
        guardarIds((previos) => previos.filter((id) => id !== solicitudId));
        setPendientes((previas) => previas.filter((p) => p.id !== solicitudId));
        return true;
      } catch (causa) {
        const fallo = comoErrorDeAccion(causa);
        if (fallo.codigo === "SIN_INGRESO") alPerderIngreso();
        else setError(fallo.message);
        return false;
      } finally {
        enCurso.current = false;
        setOcupado(false);
      }
    },
    [alPerderIngreso, cliente, codigo, guardarIds],
  );

  return {
    nombre,
    nombreRecordado,
    escribirNombre: (texto) => {
      setNombre(texto);
      setError(undefined);
    },
    turnos,
    enFila: turnos.length > 0,
    tieneIntervencion: turnos.some((t) => t.tipo === "INTERVENCION"),
    tieneMocion: turnos.some((t) => t.tipo === "MOCION"),
    pedirPalabra,
    presentarMocion,
    retirar,
    ocupado,
    error,
  };
}
