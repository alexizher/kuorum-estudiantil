"use client";

import { Boton, CampoDeTexto } from "@kuorum/ui";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { LARGO_DE_CODIGO_DE_SALA } from "./codigo-de-sala";
import { useCodigoDeSala } from "./use-codigo-de-sala";

// Deja pegar un código con espacio o guion antes de que el campo lo normalice.
const HOLGURA_PARA_PEGAR = 4;

interface Propiedades {
  /** Para pruebas; por defecto navega con el router de Next. */
  irA?: (ruta: string) => void;
}

export function FormularioDeCodigo({ irA }: Propiedades) {
  const router = useRouter();
  const { codigo, error, escribir, entrar } = useCodigoDeSala(irA ?? ((ruta) => router.push(ruta)));

  function alEnviar(evento: FormEvent<HTMLFormElement>): void {
    evento.preventDefault();
    entrar();
  }

  return (
    <form onSubmit={alEnviar} noValidate>
      <CampoDeTexto
        codigo
        etiqueta="Código de la sala"
        ayuda="Está en la proyección y en la hoja de la mesa."
        error={error}
        value={codigo}
        onChange={(evento) => escribir(evento.target.value)}
        placeholder="K7F2"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        inputMode="text"
        maxLength={LARGO_DE_CODIGO_DE_SALA + HOLGURA_PARA_PEGAR}
      />
      <Boton type="submit" variante="tinta" ancho>
        Entrar a la sala
      </Boton>
    </form>
  );
}
