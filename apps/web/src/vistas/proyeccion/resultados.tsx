import type { EstadoDeSala } from "@kuorum/contracts";
import { BloqueDeTinta } from "@kuorum/ui";
import type { CSSProperties } from "react";
import { coloresDeOpciones } from "./colores-de-opciones";
import { EtiquetaIndicativa } from "./etiqueta-indicativa";
import estilos from "./proyeccion.module.css";
import { formatearNumero, formatearPorcentaje } from "./textos";
import { veredictoDe } from "./veredicto";

type Pregunta = NonNullable<EstadoDeSala["pregunta"]>;

interface Propiedades {
  estado: EstadoDeSala;
  pregunta: Pregunta;
}

export function Resultados({ estado, pregunta }: Propiedades) {
  const { resultado } = pregunta;
  if (resultado === null) return null;
  const veredicto = veredictoDe(resultado);
  const colores = coloresDeOpciones(resultado.porOpcion.map((o) => o.texto));
  const mayor = Math.max(...resultado.porOpcion.map((o) => o.votos), 0);
  return (
    <section
      className={`${estilos.escena} ${estilos.resultados}`}
      aria-labelledby="pregunta-resultados"
    >
      <div className={estilos.preguntaChica}>
        {estado.sala.indicativa ? <EtiquetaIndicativa /> : null}
        <h1 id="pregunta-resultados">{pregunta.texto}</h1>
      </div>
      <div className={estilos.veredicto}>
        <p className={`titular ${estilos.veredictoPalabra}`} data-tono={veredicto.tono}>
          {veredicto.palabra}
        </p>
        <p className={estilos.veredictoRegla}>{veredicto.regla}</p>
        <p className={estilos.veredictoTotal}>
          <span className="num">{formatearNumero(resultado.totalVotos)}</span> votos emitidos
          {estado.asistencia !== null ? (
            <>
              {" de "}
              <span className="num">{formatearNumero(estado.asistencia)}</span> asistentes
            </>
          ) : null}
        </p>
      </div>
      <div className={estilos.derecha}>
        <div
          className={estilos.cartel}
          role="list"
          aria-label="Votos por opción"
          style={{ "--n": resultado.porOpcion.length } as CSSProperties}
        >
          {resultado.porOpcion.map((opcion, i) => (
            <BloqueDeTinta
              key={opcion.opcionId}
              color={colores[i] ?? "tinta"}
              etiqueta={opcion.texto}
              cifra={opcion.votos}
              porcentaje={formatearPorcentaje(opcion.porcentaje)}
              proporcion={mayor > 0 ? opcion.votos / mayor : 0}
            />
          ))}
        </div>
        <ul
          className={estilos.rotulos}
          aria-hidden="true"
          style={{ "--n": resultado.porOpcion.length } as CSSProperties}
        >
          {resultado.porOpcion.map((opcion) => (
            <li key={opcion.opcionId}>{opcion.texto}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
