"use client";

import { useId } from "react";

interface Propiedades {
  valor: string;
  alCambiar: (valor: string) => void;
}

export function CampoDeOrdenDelDia({ valor, alCambiar }: Propiedades) {
  const id = useId();
  return (
    <div className="campo">
      <label className="campo__etiqueta" htmlFor={id}>
        Orden del día (un punto por línea)
      </label>
      <textarea
        id={id}
        className="campo__entrada"
        rows={4}
        value={valor}
        onChange={(e) => alCambiar(e.target.value)}
      />
    </div>
  );
}
