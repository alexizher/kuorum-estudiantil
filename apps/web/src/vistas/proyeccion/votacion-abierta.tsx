import type { EstadoDeSala } from "@kuorum/contracts";
import { EntradaConQr } from "./entrada-con-qr";
import { EtiquetaIndicativa } from "./etiqueta-indicativa";
import { coloresDeOpciones } from "./colores-de-opciones";
import estilos from "./proyeccion.module.css";
import { formatearNumero } from "./textos";
import type { CSSProperties } from "react";

type Pregunta = NonNullable<EstadoDeSala["pregunta"]>;

interface Propiedades {
  estado: EstadoDeSala;
  pregunta: Pregunta;
  urlDeEntrada: string;
}

export function VotacionAbierta({ estado, pregunta, urlDeEntrada }: Propiedades) {
  const colores = coloresDeOpciones(pregunta.opciones.map((o) => o.texto));
  const { asistencia } = estado;
  const avance =
    asistencia !== null && asistencia > 0
      ? Math.min(100, (pregunta.votosEmitidos / asistencia) * 100)
      : null;
  return (
    <section
      className={`${estilos.escena} ${estilos.votacion}`}
      aria-labelledby="pregunta-votacion"
    >
      <div>
        {estado.sala.indicativa ? <EtiquetaIndicativa /> : null}
        <h1 id="pregunta-votacion" className={`titular ${estilos.preguntaGrande}`}>
          {pregunta.texto}
        </h1>
        <ul className={estilos.opciones} aria-label="Opciones">
          {pregunta.opciones.map((opcion, i) => (
            <li key={opcion.id} style={{ "--color": `var(--${colores[i]})` } as CSSProperties}>
              {opcion.texto}
            </li>
          ))}
        </ul>
      </div>
      <EntradaConQr codigo={estado.sala.codigo} urlDeEntrada={urlDeEntrada} />
      <div className={estilos.avance} aria-live="polite">
        <p className={estilos.avanceTexto}>
          Votos emitidos <strong className="num">{formatearNumero(pregunta.votosEmitidos)}</strong>
          {asistencia !== null ? (
            <>
              {" de "}
              <span className="num">{formatearNumero(asistencia)}</span>
            </>
          ) : null}
        </p>
        {avance !== null ? (
          <div className="barra" aria-hidden="true">
            <div className="barra__llena" style={{ width: `${Number(avance.toFixed(1))}%` }} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
