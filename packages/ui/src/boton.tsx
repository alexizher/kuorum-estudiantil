import type { ButtonHTMLAttributes } from "react";

export type VarianteDeBoton = "borde" | "tinta" | "si" | "peligro" | "plano";

interface OpcionesDeClases {
  variante?: VarianteDeBoton;
  ancho?: boolean;
}

// Las mismas clases sirven para un <a> con aspecto de botón.
export function clasesDeBoton({ variante = "borde", ancho = false }: OpcionesDeClases): string {
  return ["boton", variante === "borde" ? "" : `boton--${variante}`, ancho ? "boton--ancho" : ""]
    .filter(Boolean)
    .join(" ");
}

export interface PropiedadesDeBoton
  extends ButtonHTMLAttributes<HTMLButtonElement>, OpcionesDeClases {}

export function Boton({
  variante,
  ancho,
  className,
  type = "button",
  ...resto
}: PropiedadesDeBoton) {
  const clases = [
    clasesDeBoton({ ...(variante ? { variante } : {}), ...(ancho ? { ancho } : {}) }),
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <button type={type} className={clases} {...resto} />;
}
