"use client";

import type { EstadoDeSala } from "@kuorum/contracts";
import { Boton } from "@kuorum/ui";
import { coloresDeOpciones } from "../proyeccion/colores-de-opciones";
import { formatearNumero } from "../proyeccion/textos";
import { veredictoDe } from "../proyeccion/veredicto";
import type { PreguntaDeMesa } from "./cliente-de-mesa";
import estilos from "./mesa.module.css";
import { ETIQUETA_DE_PREGUNTA } from "./textos";

type PreguntaPublica = NonNullable<EstadoDeSala["pregunta"]>;

interface Propiedades {
  /** La que está abierta o, si no hay, la última cerrada. */
  pregunta: PreguntaDeMesa | null;
  /** Lo que ve el público de esa pregunta: votos emitidos y, ya proyectado, el resultado. */
  publica: PreguntaPublica | null;
  asistencia: number | null;
  ocupado: boolean;
  alCerrar: (preguntaId: string) => void;
  alPedirAnular: (preguntaId: string) => void;
  alProyectar: (preguntaId: string) => void;
}

export function votacionActual(preguntas: readonly PreguntaDeMesa[]): PreguntaDeMesa | null {
  const abierta = preguntas.find((p) => p.estado === "ABIERTA");
  if (abierta !== undefined) return abierta;
  const cerradas = preguntas.filter((p) => p.estado === "CERRADA");
  return cerradas[cerradas.length - 1] ?? null;
}

function Resultado({ resultado }: { resultado: NonNullable<PreguntaPublica["resultado"]> }) {
  const colores = coloresDeOpciones(resultado.porOpcion.map((o) => o.texto));
  const mayor = Math.max(1, ...resultado.porOpcion.map((o) => o.votos));
  const veredicto = veredictoDe(resultado);
  return (
    <>
      <ul className={estilos.conteo} aria-label="Resultado proyectado">
        {resultado.porOpcion.map((opcion, i) => (
          <li key={opcion.opcionId}>
            <span>{opcion.texto}</span>
            <span
              className={estilos.conteoBarra}
              style={{
                width: `${Math.max(2, (opcion.votos / mayor) * 100)}%`,
                background: `var(--${colores[i] ?? "tinta"})`,
              }}
              aria-hidden="true"
            />
            <span className={`${estilos.conteoNum} num`}>{formatearNumero(opcion.votos)}</span>
          </li>
        ))}
      </ul>
      <p className={estilos.veredicto}>
        {veredicto.palabra}. {veredicto.regla}
      </p>
    </>
  );
}

export function VotacionActual({
  pregunta,
  publica,
  asistencia,
  ocupado,
  alCerrar,
  alPedirAnular,
  alProyectar,
}: Propiedades) {
  if (pregunta === null) {
    return (
      <div className={estilos.votacion}>
        <p className={estilos.vacia}>No hay una votación abierta. Abre una de las preguntas.</p>
      </div>
    );
  }
  const abierta = pregunta.estado === "ABIERTA";
  const votos = publica?.id === pregunta.id ? publica.votosEmitidos : 0;
  const avance =
    asistencia !== null && asistencia > 0 ? Math.min(100, (votos / asistencia) * 100) : 0;
  const resultado = publica?.id === pregunta.id ? publica.resultado : null;
  return (
    <div className={estilos.votacion}>
      <p className={estilos.estadoDeVotacion}>
        <span className={estilos.chip} data-pregunta={pregunta.estado}>
          {ETIQUETA_DE_PREGUNTA[pregunta.estado]}
        </span>
        <span className="suave">Voto secreto, mayoría simple</span>
      </p>
      <p className={`titular ${estilos.textoDePregunta}`}>{pregunta.texto}</p>
      <div className={estilos.avance}>
        <p className={estilos.avanceTexto}>
          <strong className="num">{formatearNumero(votos)}</strong>
          {asistencia !== null ? (
            <>
              {" "}
              de <span className="num">{formatearNumero(asistencia)}</span> votaron
            </>
          ) : (
            <> {votos === 1 ? "voto" : "votos"}</>
          )}
        </p>
        {asistencia !== null ? (
          <div className="barra" aria-hidden="true">
            <div
              className={estilos.barraLlena}
              style={{ width: `${Number(avance.toFixed(1))}%` }}
            />
          </div>
        ) : null}
      </div>
      {resultado !== null ? (
        <Resultado resultado={resultado} />
      ) : (
        <p className={estilos.nota}>
          {abierta
            ? "El conteo se ve al proyectar el resultado, con la votación cerrada."
            : "Votación cerrada. Proyecta el resultado para verlo."}
        </p>
      )}
      <div className={estilos.accionesDeVotacion}>
        {abierta ? (
          <>
            <Boton variante="peligro" onClick={() => alCerrar(pregunta.id)} disabled={ocupado}>
              Cerrar votación
            </Boton>
            <Boton onClick={() => alPedirAnular(pregunta.id)} disabled={ocupado}>
              Anular
            </Boton>
          </>
        ) : pregunta.resultadoProyectado ? (
          <p className={estilos.nota}>El resultado ya está en la proyección.</p>
        ) : (
          <Boton variante="tinta" onClick={() => alProyectar(pregunta.id)} disabled={ocupado}>
            Proyectar resultado
          </Boton>
        )}
      </div>
    </div>
  );
}
