"use client";

import type { EstadoDeSala } from "@kuorum/contracts";
import { Boton, Cronometro } from "@kuorum/ui";
import { etiquetaDeMocion } from "../proyeccion/textos";
import estilos from "./mesa.module.css";
import { personas } from "./textos";

type Palabra = EstadoDeSala["palabra"];

interface Propiedades {
  palabra: Palabra;
  segundosRestantes: number | null;
  /** La sesión está en curso: solo entonces se puede dar la palabra. */
  enCurso: boolean;
  ocupado: boolean;
  alDarLaPalabra: (solicitudId?: string) => void;
  alTerminar: () => void;
  alSumarMinuto: () => void;
  alRechazarMocion: (solicitudId: string) => void;
}

export function FilaDePalabra({
  palabra,
  segundosRestantes,
  enCurso,
  ocupado,
  alDarLaPalabra,
  alTerminar,
  alSumarMinuto,
  alRechazarMocion,
}: Propiedades) {
  const { conLaPalabra, fila } = palabra;
  const bloqueado = ocupado || !enCurso;
  return (
    <>
      <div className={estilos.ahora} aria-live="polite">
        <p className={estilos.rotulo}>Tiene la palabra</p>
        {conLaPalabra === null ? (
          <p className={`titular ${estilos.nadie}`}>Nadie</p>
        ) : (
          <>
            <p className={`titular ${estilos.nombreActual}`}>{conLaPalabra.nombre}</p>
            {conLaPalabra.mocion !== null ? (
              <p>
                <span className="mocion">{etiquetaDeMocion(conLaPalabra.mocion)}</span>
              </p>
            ) : null}
            <Cronometro restantes={segundosRestantes ?? 0} total={conLaPalabra.segundosTotales} />
          </>
        )}
        <div className={estilos.accionesDeAhora}>
          <Boton
            variante="tinta"
            onClick={() => alDarLaPalabra()}
            disabled={bloqueado || fila.length === 0}
            aria-label="Dar la palabra a la siguiente persona de la fila"
          >
            Dar la palabra
          </Boton>
          {conLaPalabra !== null ? (
            <>
              <Boton onClick={alTerminar} disabled={bloqueado}>
                Terminar
              </Boton>
              <Boton variante="plano" onClick={alSumarMinuto} disabled={bloqueado}>
                Sumar un minuto
              </Boton>
            </>
          ) : null}
        </div>
        {!enCurso ? <p className={estilos.nota}>Inicia la sesión para dar la palabra.</p> : null}
      </div>

      <div className={estilos.fila}>
        <div className={estilos.filaCabeza}>
          <h3 className="titular">Fila</h3>
          <p className="suave num">{personas(fila.length)}</p>
        </div>
        {fila.length === 0 ? (
          <p className={estilos.vacia}>Nadie pidió la palabra. Las solicitudes aparecen aquí.</p>
        ) : (
          <ol>
            {fila.map((solicitud, indice) => (
              <li
                key={solicitud.id}
                className={solicitud.tipo === "MOCION" ? estilos.esMocion : undefined}
              >
                <span className={`${estilos.posicion} num`}>{indice + 1}</span>
                <div className={estilos.quien}>
                  {solicitud.mocion !== null ? (
                    <span className="mocion">{etiquetaDeMocion(solicitud.mocion)}</span>
                  ) : null}
                  <span className={estilos.nombreEnFila}>{solicitud.nombre}</span>
                </div>
                <div className={estilos.accionesDeFila}>
                  <Boton
                    onClick={() => alDarLaPalabra(solicitud.id)}
                    disabled={bloqueado}
                    aria-label={`Dar la palabra a ${solicitud.nombre}`}
                  >
                    Dar la palabra
                  </Boton>
                  {solicitud.tipo === "MOCION" ? (
                    <Boton
                      variante="peligro"
                      onClick={() => alRechazarMocion(solicitud.id)}
                      disabled={ocupado}
                      aria-label={`Rechazar la moción de ${solicitud.nombre}`}
                    >
                      Rechazar moción
                    </Boton>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}
