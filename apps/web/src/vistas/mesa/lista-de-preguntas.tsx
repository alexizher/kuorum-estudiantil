"use client";

import { Boton } from "@kuorum/ui";
import { EnunciadoDeDecision } from "./enunciado-de-decision";
import type { PreguntaDeMesa } from "./cliente-de-mesa";
import estilos from "./mesa.module.css";
import { ETIQUETA_DE_PREGUNTA } from "./textos";
import type { Decisiones } from "./use-decisiones";

interface Propiedades {
  preguntas: readonly PreguntaDeMesa[];
  /** Solo con la sesión en curso se puede abrir una votación. */
  enCurso: boolean;
  ocupado: boolean;
  alAbrir: (preguntaId: string) => void;
  /** Con ellas, cada votación cerrada ofrece editar su enunciado. */
  decisiones?: Decisiones;
  actaFinal?: boolean;
}

export function ListaDePreguntas({
  preguntas,
  enCurso,
  ocupado,
  alAbrir,
  decisiones,
  actaFinal = false,
}: Propiedades) {
  if (preguntas.length === 0) {
    return <p className={estilos.vacia}>Todavía no hay preguntas. Crea la primera abajo.</p>;
  }
  return (
    <ol className={estilos.preguntas}>
      {preguntas.map((pregunta) => (
        <li key={pregunta.id}>
          <div>
            <p className={estilos.textoDeLista}>{pregunta.texto}</p>
            <p className={`${estilos.opcionesDeLista} suave`}>
              {pregunta.opciones.map((o) => o.texto).join(", ")}
            </p>
          </div>
          <span className={estilos.chip} data-pregunta={pregunta.estado}>
            {ETIQUETA_DE_PREGUNTA[pregunta.estado]}
          </span>
          {pregunta.estado === "BORRADOR" ? (
            <Boton
              onClick={() => alAbrir(pregunta.id)}
              disabled={ocupado || !enCurso}
              aria-label={`Abrir la votación: ${pregunta.texto}`}
            >
              Abrir votación
            </Boton>
          ) : null}
          {pregunta.estado === "CERRADA" ? (
            <EnunciadoPorPregunta
              pregunta={pregunta}
              decisiones={decisiones}
              actaFinal={actaFinal}
            />
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function EnunciadoPorPregunta({
  pregunta,
  decisiones,
  actaFinal,
}: {
  pregunta: PreguntaDeMesa;
  decisiones: Decisiones | undefined;
  actaFinal: boolean;
}) {
  const decision = decisiones?.decisiones.find((d) => d.preguntaId === pregunta.id);
  if (!decisiones || !decision) return null;
  return (
    <EnunciadoDeDecision
      key={`${decision.id}-${decision.enunciado ?? ""}`}
      decision={decision}
      bloqueado={actaFinal}
      guardar={decisiones.guardarEnunciado}
    />
  );
}
