import type { CSSProperties } from "react";

export type ColorDeTinta = "si" | "no" | "ambar" | "tinta";

interface Propiedades {
  color: ColorDeTinta;
  etiqueta: string;
  cifra: number;
  /** Texto ya formateado, por ejemplo "64,2 %". */
  porcentaje: string;
  /** De 0 a 1, respecto a la columna más alta. */
  proporcion: number;
}

// Debe haber un <DefinicionesDeTinta /> en la página para que el borde irregular se aplique.
export function DefinicionesDeTinta() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <filter id="tinta" x="-2%" y="-2%" width="104%" height="104%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.9"
          numOctaves="2"
          seed="7"
          result="ruido"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="ruido"
          scale="3"
          xChannelSelector="R"
          yChannelSelector="G"
          result="borde"
        />
        <feColorMatrix
          in="ruido"
          type="matrix"
          values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.9 1.1"
          result="grano"
        />
        <feComposite in="borde" in2="grano" operator="in" />
      </filter>
    </svg>
  );
}

export function BloqueDeTinta({ color, etiqueta, cifra, porcentaje, proporcion }: Propiedades) {
  const alto = Math.min(1, Math.max(0, proporcion));
  const formateada = cifra.toLocaleString("es-CO");
  return (
    <div
      className="columna"
      role="listitem"
      style={
        {
          "--color": `var(--${color})`,
          "--alto": `${Number((alto * 100).toFixed(1))}%`,
        } as CSSProperties
      }
      aria-label={`${etiqueta}: ${formateada} votos, ${porcentaje}`}
    >
      <span className="columna__pct num" aria-hidden="true">
        {porcentaje}
      </span>
      <span className="columna__cifra num" aria-hidden="true">
        {formateada}
      </span>
      <span className="columna__tinta" aria-hidden="true">
        <span className="columna__pasada" />
        <span className="columna__bloque" />
      </span>
    </div>
  );
}
