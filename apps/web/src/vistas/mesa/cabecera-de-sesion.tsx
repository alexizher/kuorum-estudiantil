"use client";

import { Boton, clasesDeBoton } from "@kuorum/ui";
import Link from "next/link";
import { useState } from "react";
import type { ModoDeSala } from "./cliente-de-mesa";
import estilos from "./mesa.module.css";
import { ETIQUETA_DE_MODO, etiquetaDeEstadoDeSesion } from "./textos";

interface Propiedades {
  titulo: string;
  codigo: string;
  modo: ModoDeSala;
  estado: string;
  ocupado: boolean;
  alIniciar: () => void;
  alPedirTerminar: () => void;
  alCopiarEnlace: () => Promise<boolean>;
}

export function CabeceraDeSesion({
  titulo,
  codigo,
  modo,
  estado,
  ocupado,
  alIniciar,
  alPedirTerminar,
  alCopiarEnlace,
}: Propiedades) {
  const [copiado, setCopiado] = useState<boolean | undefined>(undefined);
  const puedeIniciar = estado === "PROGRAMADA" || estado === "ABIERTA";
  const puedeTerminar = estado === "EN_CURSO";

  async function copiar(): Promise<void> {
    setCopiado(await alCopiarEnlace());
  }

  return (
    <header role="banner" className={estilos.cabecera}>
      <div className={estilos.cabeceraTitulo}>
        <Link href="/mesa" className={estilos.volver}>
          Sesiones
        </Link>
        <h1 className={`titular ${estilos.tituloDeSesion}`}>{titulo}</h1>
        <p className={estilos.salaDeSesion}>
          Sala <strong>{codigo}</strong>
        </p>
        <p className={estilos.datosDeSesion}>
          <span className={estilos.chip} data-estado={estado}>
            {etiquetaDeEstadoDeSesion(estado)}
          </span>
          <span className="suave">{ETIQUETA_DE_MODO[modo]}</span>
        </p>
      </div>
      <div className={estilos.accionesDeCabecera}>
        {puedeIniciar ? (
          <Boton variante="tinta" onClick={alIniciar} disabled={ocupado}>
            Iniciar sesión
          </Boton>
        ) : null}
        {puedeTerminar ? (
          <Boton variante="peligro" onClick={alPedirTerminar} disabled={ocupado}>
            Terminar sesión
          </Boton>
        ) : null}
        <a
          className={clasesDeBoton({})}
          href={`/proyeccion/${encodeURIComponent(codigo)}`}
          target="_blank"
          rel="noopener"
        >
          Abrir proyección
        </a>
        <Boton className={estilos.copiar} onClick={() => void copiar()}>
          Copiar enlace para participantes
        </Boton>
      </div>
      <p className={copiado === false ? estilos.errorEnLinea : estilos.copiado} role="status">
        {copiado === undefined
          ? ""
          : copiado
            ? "Enlace copiado."
            : "No se pudo copiar. Copia la dirección desde el navegador."}
      </p>
    </header>
  );
}
