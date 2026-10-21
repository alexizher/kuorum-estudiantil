"use client";

import { Boton, HojaInferior } from "@kuorum/ui";
import estilos from "./mesa.module.css";

interface Propiedades {
  abierta: boolean;
  titulo: string;
  texto: string;
  textoDeConfirmar: string;
  alConfirmar: () => void;
  alCancelar: () => void;
}

/** Confirmación de lo que no se puede deshacer; reemplaza a window.confirm. */
export function HojaDeConfirmacion({
  abierta,
  titulo,
  texto,
  textoDeConfirmar,
  alConfirmar,
  alCancelar,
}: Propiedades) {
  return (
    <HojaInferior abierta={abierta} titulo={titulo} alCerrar={alCancelar}>
      <p className={estilos.textoDeHoja}>{texto}</p>
      <div className={estilos.accionesDeHoja}>
        <Boton variante="peligro" onClick={alConfirmar}>
          {textoDeConfirmar}
        </Boton>
        <Boton onClick={alCancelar}>Cancelar</Boton>
      </div>
    </HojaInferior>
  );
}
