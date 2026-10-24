"use client";

import { useMemo, useSyncExternalStore } from "react";
import { FuenteDeEstadoPorConsulta } from "@/tiempo-real/fuente-por-consulta";
import { PoliticaFija } from "@/tiempo-real/intervalo-adaptativo";
import { rutaDeSala } from "@/portada/codigo-de-sala";
import { ControlesDeProyeccion } from "./controles-de-proyeccion";
import { Proyeccion } from "./proyeccion";
import estilos from "./proyeccion.module.css";
import { useProyeccion } from "./use-proyeccion";

/** La proyección consulta cada 3 s (ADR 0001). */
export const INTERVALO_DE_PROYECCION_MS = 3000;

const sinSuscripcion = () => () => undefined;
const origenDelNavegador = () => window.location.origin;
const origenDelServidor = () => "";

export function ProyeccionEnVivo({ codigo }: { codigo: string }) {
  const fuente = useMemo(
    () =>
      new FuenteDeEstadoPorConsulta(
        (entrada, opciones) => fetch(entrada, opciones),
        new PoliticaFija(INTERVALO_DE_PROYECCION_MS),
      ),
    [],
  );
  const proyeccion = useProyeccion(fuente, codigo);
  const origen = useSyncExternalStore(sinSuscripcion, origenDelNavegador, origenDelServidor);
  return (
    <>
      <main className={estilos.pagina}>
        <Proyeccion {...proyeccion} urlDeEntrada={`${origen}${rutaDeSala(codigo)}`} />
      </main>
      <ControlesDeProyeccion />
    </>
  );
}
