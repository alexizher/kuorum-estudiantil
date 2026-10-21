"use client";

import { Boton } from "@kuorum/ui";
import Link from "next/link";
import type { SesionDeLista } from "./cliente-de-mesa";
import estilos from "./mesa.module.css";
import { ETIQUETA_DE_MODO, etiquetaDeEstadoDeSesion, fechaCorta } from "./textos";

interface Propiedades {
  sesiones: readonly SesionDeLista[];
  cargando: boolean;
  error: string | undefined;
  alReintentar: () => void;
}

export function ListaDeSesiones({ sesiones, cargando, error, alReintentar }: Propiedades) {
  if (error !== undefined) {
    return (
      <div role="alert" className={estilos.alerta}>
        <p>{error}</p>
        <Boton onClick={alReintentar}>Reintentar</Boton>
      </div>
    );
  }
  if (cargando) {
    return (
      <p role="status" className={estilos.vacia}>
        Cargando sesiones...
      </p>
    );
  }
  if (sesiones.length === 0) {
    return <p className={estilos.vacia}>Todavía no hay sesiones. Crea la primera aquí al lado.</p>;
  }
  return (
    <ul className={estilos.sesiones}>
      {sesiones.map((sesion) => (
        <li key={sesion.id}>
          <Link href={`/mesa/sesiones/${encodeURIComponent(sesion.id)}`} className={estilos.sesion}>
            <span className={`titular ${estilos.sesionTitulo}`}>{sesion.titulo}</span>
            <span className={estilos.sesionSala}>
              Sala <strong>{sesion.codigoDeSala}</strong>
            </span>
            <span className={estilos.sesionDatos}>
              <span className={estilos.chip} data-estado={sesion.estado}>
                {etiquetaDeEstadoDeSesion(sesion.estado)}
              </span>
              <span className="suave">{ETIQUETA_DE_MODO[sesion.modo]}</span>
              <span className="suave num">{fechaCorta(sesion.creadaEn)}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
