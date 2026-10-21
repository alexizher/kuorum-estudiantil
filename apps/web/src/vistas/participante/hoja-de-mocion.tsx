"use client";

import { Boton, CampoDeTexto, HojaInferior } from "@kuorum/ui";
import { DESCRIPCION_DE_MOCION, NOMBRE_DE_MOCION, type TipoDeMocion } from "@kuorum/domain";
import { useState, type FormEvent } from "react";
import estilos from "./participante.module.css";

const TIPOS: readonly TipoDeMocion[] = [
  "ORDEN",
  "PROCEDIMIENTO",
  "ACLARACION",
  "SUFICIENTE_ILUSTRACION",
];

interface Propiedades {
  abierta: boolean;
  alCerrar: () => void;
  /** Resuelve true si la moción quedó presentada. */
  alPresentar: (tipo: TipoDeMocion) => Promise<boolean>;
  /** Solo se pide el nombre si todavía no se conoce. */
  nombre: { valor: string; alCambiar: (texto: string) => void } | null;
  error: string | undefined;
  ocupado: boolean;
}

export function HojaDeMocion({
  abierta,
  alCerrar,
  alPresentar,
  nombre,
  error,
  ocupado,
}: Propiedades) {
  const [tipo, setTipo] = useState<TipoDeMocion | null>(null);

  async function presentar(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    if (tipo === null || ocupado) return;
    if (await alPresentar(tipo)) {
      setTipo(null);
      alCerrar();
    }
  }

  return (
    <HojaInferior abierta={abierta} titulo="Presentar una moción" alCerrar={alCerrar}>
      <form onSubmit={(evento) => void presentar(evento)} noValidate>
        <p className={estilos.hojaIntro}>
          Elige el tipo. La mesa la atiende antes que las intervenciones.
        </p>
        <fieldset className={estilos.tipos}>
          <legend className={estilos.soloLectores}>Tipo de moción</legend>
          {TIPOS.map((candidato) => (
            <label key={candidato} className={estilos.tipo}>
              <input
                type="radio"
                name="tipo"
                value={candidato}
                checked={tipo === candidato}
                onChange={() => setTipo(candidato)}
              />
              <span className={estilos.marca} aria-hidden="true" />
              <span className={estilos.tipoNombre}>{NOMBRE_DE_MOCION[candidato]}</span>
              <span className={estilos.tipoDescripcion}>{DESCRIPCION_DE_MOCION[candidato]}</span>
            </label>
          ))}
        </fieldset>
        {nombre ? (
          <CampoDeTexto
            className={estilos.hojaCampo}
            etiqueta="Cómo quieres que te anuncien"
            value={nombre.valor}
            onChange={(evento) => nombre.alCambiar(evento.target.value)}
            maxLength={200}
            autoComplete="name"
          />
        ) : null}
        {error ? (
          <p className={estilos.error} role="alert">
            {error}
          </p>
        ) : null}
        <div className={estilos.hojaAcciones}>
          <Boton type="submit" variante="tinta" aria-disabled={tipo === null || ocupado}>
            Presentar moción
          </Boton>
        </div>
      </form>
    </HojaInferior>
  );
}
