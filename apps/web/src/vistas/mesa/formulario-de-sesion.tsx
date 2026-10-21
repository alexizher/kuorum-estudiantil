"use client";

import { Boton, CampoDeTexto } from "@kuorum/ui";
import { useState, type FormEvent } from "react";
import type { ModoDeSala } from "./cliente-de-mesa";
import estilos from "./mesa.module.css";
import { ETIQUETA_DE_MODO, EXPLICACION_DE_MODO } from "./textos";
import { SEGUNDOS_POR_DEFECTO, type Sesiones } from "./use-sesiones";

const MODOS: readonly ModoDeSala[] = ["CON_CODIGOS", "SALA_ABIERTA"];

interface Propiedades {
  crear: Sesiones["crear"];
  creando: boolean;
  error: string | undefined;
}

export function FormularioDeSesion({ crear, creando, error }: Propiedades) {
  const [titulo, setTitulo] = useState("");
  const [modo, setModo] = useState<ModoDeSala>("CON_CODIGOS");
  const [segundos, setSegundos] = useState(String(SEGUNDOS_POR_DEFECTO));

  async function alEnviar(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    if (await crear({ titulo, modo, segundos: Number(segundos) })) setTitulo("");
  }

  return (
    <form className={estilos.formulario} onSubmit={(e) => void alEnviar(e)} noValidate>
      <CampoDeTexto
        etiqueta="Título"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        maxLength={300}
        autoComplete="off"
      />
      <fieldset className={estilos.conjunto}>
        <legend>Modo</legend>
        {MODOS.map((valor) => (
          <label className={estilos.radio} key={valor}>
            <input
              type="radio"
              name="modo"
              value={valor}
              checked={modo === valor}
              onChange={() => setModo(valor)}
            />
            <span>
              <strong>{ETIQUETA_DE_MODO[valor]}</strong>
              <span className={`${estilos.explicacion} suave`}>{EXPLICACION_DE_MODO[valor]}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <CampoDeTexto
        etiqueta="Segundos por intervención"
        type="number"
        inputMode="numeric"
        min={30}
        max={900}
        value={segundos}
        onChange={(e) => setSegundos(e.target.value)}
      />
      {error ? (
        <p role="alert" className={estilos.errorEnLinea}>
          {error}
        </p>
      ) : null}
      <Boton type="submit" variante="tinta" disabled={creando}>
        Crear sesión
      </Boton>
    </form>
  );
}
