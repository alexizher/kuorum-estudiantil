"use client";

import { clasesDeBoton } from "@kuorum/ui";
import Link from "next/link";
import type { ModoDeSala } from "./cliente-de-mesa";
import estilos from "./mesa.module.css";
import { formatearNumero } from "../proyeccion/textos";

interface Propiedades {
  sesionId: string;
  modo: ModoDeSala;
  asistencia: number | null;
}

/** Asistencia y, con códigos, el camino para generarlos y entregarlos. */
export function SalaDeSesion({ sesionId, modo, asistencia }: Propiedades) {
  const base = `/mesa/sesiones/${encodeURIComponent(sesionId)}`;
  return (
    <>
      <div className={estilos.asistencia}>
        <h3 className="titular">Asistencia</h3>
        {modo === "CON_CODIGOS" ? (
          <dl>
            <div>
              <dt>Códigos activados</dt>
              <dd className="num">{asistencia === null ? "..." : formatearNumero(asistencia)}</dd>
            </div>
          </dl>
        ) : (
          <p className={estilos.nota}>
            En sala abierta no hay códigos, así que la asistencia no se cuenta.
          </p>
        )}
      </div>
      {modo === "CON_CODIGOS" ? (
        <div className={estilos.codigos}>
          <h3 className="titular">Códigos de acceso</h3>
          <p className={estilos.nota}>
            Cada código se activa una sola vez y se muestra una sola vez al generarlo.
          </p>
          <div className={estilos.accionesDeVotacion}>
            <Link className={clasesDeBoton({})} href={`${base}/codigos`}>
              Generar códigos
            </Link>
            <Link className={clasesDeBoton({})} href={`${base}/entregar`}>
              Entregar códigos
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
