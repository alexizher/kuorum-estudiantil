"use client";

import { Boton } from "@kuorum/ui";
import type { PreguntaDeMesa } from "./cliente-de-mesa";
import estilos from "./mesa.module.css";
import { ETIQUETA_DE_PREGUNTA } from "./textos";

interface Propiedades {
  preguntas: readonly PreguntaDeMesa[];
  /** Solo con la sesión en curso se puede abrir una votación. */
  enCurso: boolean;
  ocupado: boolean;
  alAbrir: (preguntaId: string) => void;
}

export function ListaDePreguntas({ preguntas, enCurso, ocupado, alAbrir }: Propiedades) {
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
        </li>
      ))}
    </ol>
  );
}
