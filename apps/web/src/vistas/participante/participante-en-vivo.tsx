"use client";

import { useEffect, useMemo, useRef } from "react";
import { FuenteDeEstadoPorConsulta } from "@/tiempo-real/fuente-por-consulta";
import {
  CONTEXTO_EN_REPOSO,
  PoliticaAdaptativa,
  PoliticaConArranque,
  type ContextoDeIntervalo,
} from "@/tiempo-real/intervalo-adaptativo";
import { almacenDelNavegador, type Almacen } from "./almacen";
import { ClienteDeSalaPorFetch } from "./cliente-de-sala";
import { contextoDeIntervalo } from "./contexto-de-intervalo";
import { Participante } from "./participante";
import { useEstadoDeSala } from "./use-estado-de-sala";
import { useIngreso } from "./use-ingreso";
import { usePalabra } from "./use-palabra";
import { useVotacion } from "./use-votacion";

interface Propiedades {
  codigo: string;
  /** Código de acceso que trae el QR de la mesa (`?c=`). */
  codigoInicial?: string;
  /** Para pruebas; por defecto el fetch y el localStorage del navegador. */
  dependencias?: { fetch?: typeof globalThis.fetch; almacen?: Almacen };
}

export function ParticipanteEnVivo({ codigo, codigoInicial, dependencias }: Propiedades) {
  const almacen = useMemo(() => dependencias?.almacen ?? almacenDelNavegador(), [dependencias]);
  const contexto = useRef<ContextoDeIntervalo>(CONTEXTO_EN_REPOSO);
  const { cliente, fuente } = useMemo(() => {
    const llamar: typeof globalThis.fetch =
      dependencias?.fetch ?? ((entrada, opciones) => fetch(entrada, opciones));
    return {
      cliente: new ClienteDeSalaPorFetch(llamar),
      fuente: new FuenteDeEstadoPorConsulta(
        llamar,
        new PoliticaConArranque(new PoliticaAdaptativa()),
        undefined,
        undefined,
        () => contexto.current,
      ),
    };
  }, [dependencias]);

  const sala = useEstadoDeSala(fuente, codigo);
  const ingreso = useIngreso(codigo, cliente, {
    almacen,
    ...(codigoInicial === undefined ? {} : { codigoInicial }),
  });
  const votacion = useVotacion(codigo, sala.estado?.pregunta ?? null, cliente, {
    almacen,
    alPerderIngreso: ingreso.perderIngreso,
  });
  const palabra = usePalabra(codigo, sala.estado, cliente, {
    almacen,
    alPerderIngreso: ingreso.perderIngreso,
  });

  const siguiente = contextoDeIntervalo(votacion, palabra);
  useEffect(() => {
    contexto.current = siguiente;
    fuente.reprogramar();
  }, [fuente, siguiente.votacionAbierta, siguiente.enFilaDePalabra]);

  // El código de acceso ya cumplió su trabajo: fuera de la barra de direcciones.
  useEffect(() => {
    if (ingreso.fase === "dentro" && window.location.search !== "") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [ingreso.fase]);

  return (
    <Participante
      codigo={codigo}
      ingreso={ingreso}
      sala={sala}
      votacion={votacion}
      palabra={palabra}
    />
  );
}
