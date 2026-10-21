"use client";

import { Boton } from "@kuorum/ui";
import { useEffect, useRef, type FormEvent } from "react";
import { IconoCandado, IconoVisto } from "./iconos";
import estilos from "./participante.module.css";
import type { Votacion } from "./use-votacion";

interface Propiedades {
  votacion: Votacion;
  indicativa: boolean;
}

function Confirmacion() {
  const nodo = useRef<HTMLDivElement>(null);
  useEffect(() => nodo.current?.focus(), []);
  return (
    <div className={estilos.confirmado} ref={nodo} tabIndex={-1}>
      <div className={estilos.sello} aria-hidden="true">
        <IconoVisto />
      </div>
      <h1 className="titular">Tu voto quedó registrado</h1>
      <p>Los resultados salen en la proyección cuando la mesa cierre la votación.</p>
      <p className="suave">Nadie puede ver qué elegiste, ni la mesa.</p>
    </div>
  );
}

export function PanelDeVoto({ votacion, indicativa }: Propiedades) {
  const { abierta, yaVoto, elegida, elegir, votar, enviando, error } = votacion;

  if (abierta === null) {
    return (
      <>
        <h1 className={`titular ${estilos.mensaje}`}>Todavía no hay una votación abierta.</h1>
        <p className={estilos.nota}>Cuando la mesa abra una, aparece aquí sola.</p>
      </>
    );
  }
  if (yaVoto) return <Confirmacion />;

  function enviar(evento: FormEvent<HTMLFormElement>): void {
    evento.preventDefault();
    void votar();
  }

  return (
    <form onSubmit={enviar} noValidate>
      <p className={estilos.estado}>
        <span className={estilos.estadoAbierta}>Votación abierta</span>
        <span className={estilos.estadoSecreto}>
          <IconoCandado />
          Voto secreto
        </span>
      </p>
      {indicativa ? (
        <p className={estilos.indicativa}>
          <strong>Votación indicativa</strong>
          Cuenta un voto por navegador, no por persona.
        </p>
      ) : null}
      <h1 className={`titular ${estilos.pregunta}`} id="pregunta-abierta">
        {abierta.texto}
      </h1>
      <fieldset className={estilos.opciones} aria-labelledby="pregunta-abierta">
        {abierta.opciones.map((opcion) => (
          <label key={opcion.id} className={estilos.opcion}>
            <input
              type="radio"
              name="voto"
              value={opcion.id}
              checked={elegida === opcion.id}
              onChange={() => elegir(opcion.id)}
            />
            {opcion.texto}
            <span className={estilos.marca} aria-hidden="true" />
          </label>
        ))}
      </fieldset>
      <div className={estilos.accionFija}>
        {error ? (
          <p className={estilos.error} role="alert">
            {error}
          </p>
        ) : (
          <p className={estilos.ayuda} id="ayuda-del-voto">
            {elegida === null
              ? "Elige una opción para votar."
              : "Puedes cambiar la opción hasta que votes."}
          </p>
        )}
        <Boton
          type="submit"
          variante="tinta"
          ancho
          aria-disabled={elegida === null || enviando}
          aria-describedby={error ? undefined : "ayuda-del-voto"}
        >
          Votar
        </Boton>
      </div>
    </form>
  );
}
