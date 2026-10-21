"use client";

import { Boton, CampoDeTexto } from "@kuorum/ui";
import type { FormEvent } from "react";
import estilos from "./mesa.module.css";
import {
  OPCIONES_MAX,
  OPCIONES_MIN,
  type FormularioDePregunta,
} from "./use-formulario-de-pregunta";

interface Propiedades {
  formulario: FormularioDePregunta;
  ocupado: boolean;
}

export function FormularioDePreguntaNueva({ formulario, ocupado }: Propiedades) {
  const { texto, plantilla, opciones, error } = formulario;

  function alEnviar(evento: FormEvent<HTMLFormElement>): void {
    evento.preventDefault();
    void formulario.enviar();
  }

  return (
    <form className={estilos.formulario} onSubmit={alEnviar} noValidate>
      <CampoDeTexto
        etiqueta="Pregunta"
        value={texto}
        onChange={(e) => formulario.escribirTexto(e.target.value)}
        maxLength={300}
        autoComplete="off"
      />
      <fieldset className={estilos.conjunto}>
        <legend>Opciones</legend>
        <label className={estilos.radio}>
          <input
            type="radio"
            name="opciones"
            checked={plantilla}
            onChange={() => formulario.elegirPlantilla(true)}
          />
          <span>Sí, No, Me abstengo</span>
        </label>
        <label className={estilos.radio}>
          <input
            type="radio"
            name="opciones"
            checked={!plantilla}
            onChange={() => formulario.elegirPlantilla(false)}
          />
          <span>Opciones propias</span>
        </label>
      </fieldset>
      {plantilla ? null : (
        <div className={estilos.opciones}>
          {opciones.map((opcion, indice) => (
            <div className={estilos.opcion} key={indice}>
              <CampoDeTexto
                etiqueta={`Opción ${indice + 1}`}
                value={opcion}
                onChange={(e) => formulario.escribirOpcion(indice, e.target.value)}
                maxLength={80}
                autoComplete="off"
              />
              {opciones.length > OPCIONES_MIN ? (
                <Boton variante="plano" onClick={() => formulario.quitarOpcion(indice)}>
                  Quitar opción {indice + 1}
                </Boton>
              ) : null}
            </div>
          ))}
          {opciones.length < OPCIONES_MAX ? (
            <Boton onClick={formulario.agregarOpcion}>Agregar opción</Boton>
          ) : null}
        </div>
      )}
      {error ? (
        <p role="alert" className={estilos.errorEnLinea}>
          {error}
        </p>
      ) : null}
      <Boton type="submit" variante="tinta" disabled={ocupado}>
        Crear pregunta
      </Boton>
    </form>
  );
}
