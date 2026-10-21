"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Boton } from "./boton.js";

interface Propiedades {
  abierta: boolean;
  titulo: string;
  alCerrar: () => void;
  children: ReactNode;
}

export function HojaInferior({ abierta, titulo, alCerrar, children }: Propiedades) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  useEffect(() => {
    const nodo = dialogo.current;
    if (!nodo) return;
    if (abierta && !nodo.open) {
      // jsdom y navegadores viejos no traen showModal.
      if (typeof nodo.showModal === "function") nodo.showModal();
      else nodo.setAttribute("open", "");
    } else if (!abierta && nodo.open) {
      if (typeof nodo.close === "function") nodo.close();
      else nodo.removeAttribute("open");
    }
  }, [abierta]);

  return (
    <dialog
      ref={dialogo}
      className="hoja"
      aria-labelledby={idTitulo}
      onClose={alCerrar}
      onCancel={alCerrar}
    >
      {abierta ? (
        <div className="hoja__cuerpo">
          <div className="hoja__asa" aria-hidden="true" />
          <div className="hoja__cabecera">
            <h2 className="titular hoja__titulo" id={idTitulo}>
              {titulo}
            </h2>
            <Boton variante="plano" onClick={alCerrar}>
              Cerrar
            </Boton>
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
