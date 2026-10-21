"use client";

import { Boton, CampoDeTexto } from "@kuorum/ui";
import { useState, type FormEvent } from "react";
import estilos from "./participante.module.css";

interface Propiedades {
  error: string | undefined;
  enviando: boolean;
  alEnviar: (codigo: string) => void;
}

export function PantallaDeCodigo({ error, enviando, alEnviar }: Propiedades) {
  const [codigo, setCodigo] = useState("");

  function enviar(evento: FormEvent<HTMLFormElement>): void {
    evento.preventDefault();
    alEnviar(codigo);
  }

  return (
    <section className={estilos.pantalla} aria-labelledby="titulo-de-codigo">
      <h1 id="titulo-de-codigo" className="titular">
        Entra con tu código
      </h1>
      <form onSubmit={enviar} noValidate>
        <CampoDeTexto
          codigo
          className={estilos.campoDeAcceso}
          etiqueta="Tu código de acceso"
          ayuda="Está en la hoja que te dieron o en el QR de la mesa."
          error={error}
          value={codigo}
          onChange={(evento) => setCodigo(evento.target.value)}
          placeholder="ABCD-EFGH"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={20}
        />
        <Boton type="submit" variante="tinta" ancho disabled={enviando}>
          {enviando ? "Entrando..." : "Entrar a la sala"}
        </Boton>
      </form>
    </section>
  );
}
