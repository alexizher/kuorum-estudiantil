"use client";

import { useId } from "react";
import type { Tema } from "./tema.js";
import { useTema } from "./tema-provider.js";

const OPCIONES: readonly { valor: Tema; etiqueta: string }[] = [
  { valor: "claro", etiqueta: "Claro" },
  { valor: "oscuro", etiqueta: "Oscuro" },
  { valor: "sistema", etiqueta: "Sistema" },
];

export function SelectorDeTema() {
  const { tema, cambiar } = useTema();
  const idEtiqueta = useId();
  return (
    <div className="tema">
      <span id={idEtiqueta}>Tema</span>
      <div className="tema__grupo" role="group" aria-labelledby={idEtiqueta}>
        {OPCIONES.map((opcion) => (
          <button
            key={opcion.valor}
            type="button"
            aria-pressed={tema === opcion.valor}
            onClick={() => cambiar(opcion.valor)}
          >
            {opcion.etiqueta}
          </button>
        ))}
      </div>
    </div>
  );
}
