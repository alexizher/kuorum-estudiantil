"use client";

import { useRef, type KeyboardEvent } from "react";

export interface ElementoDePestana {
  id: string;
  etiqueta: string;
  aviso?: string;
  etiquetaDelAviso?: string;
}

interface Propiedades {
  etiqueta: string;
  elementos: readonly ElementoDePestana[];
  seleccionada: string;
  alSeleccionar: (id: string) => void;
}

// Cada pestaña tiene id "pestana-{id}" y controla el panel "panel-{id}", que pone quien usa el componente.
export function Pestanas({ etiqueta, elementos, seleccionada, alSeleccionar }: Propiedades) {
  const botones = useRef(new Map<string, HTMLButtonElement>());

  function alTeclear(evento: KeyboardEvent<HTMLDivElement>): void {
    const delta = evento.key === "ArrowRight" ? 1 : evento.key === "ArrowLeft" ? -1 : 0;
    const indiceDeInicio =
      evento.key === "Home" ? 0 : evento.key === "End" ? elementos.length - 1 : undefined;
    if (delta === 0 && indiceDeInicio === undefined) return;
    evento.preventDefault();
    const actual = elementos.findIndex((e) => e.id === seleccionada);
    const destino = indiceDeInicio ?? (actual + delta + elementos.length) % elementos.length;
    const elemento = elementos[destino];
    if (!elemento) return;
    alSeleccionar(elemento.id);
    botones.current.get(elemento.id)?.focus();
  }

  return (
    <div className="pestanas" role="tablist" aria-label={etiqueta} onKeyDown={alTeclear}>
      {elementos.map((elemento) => {
        const activa = elemento.id === seleccionada;
        return (
          <button
            key={elemento.id}
            ref={(nodo) => {
              if (nodo) botones.current.set(elemento.id, nodo);
              else botones.current.delete(elemento.id);
            }}
            type="button"
            role="tab"
            id={`pestana-${elemento.id}`}
            aria-controls={`panel-${elemento.id}`}
            aria-selected={activa}
            tabIndex={activa ? 0 : -1}
            onClick={() => alSeleccionar(elemento.id)}
          >
            {elemento.etiqueta}
            {elemento.aviso ? (
              <span className="pestanas__aviso num" aria-label={elemento.etiquetaDelAviso}>
                {elemento.aviso}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
