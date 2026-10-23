"use client";

import { Boton, HojaInferior } from "@kuorum/ui";
import { useState } from "react";
import estilos from "./administracion.module.css";
import type { ContrasenaPorEntregar } from "./use-personal";

async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

/** La contraseña recién generada. Al cerrar se borra del estado y no se puede volver a ver. */
export function ContrasenaUnaVez({
  porEntregar,
  alCerrar,
}: {
  porEntregar: ContrasenaPorEntregar | null;
  alCerrar: () => void;
}) {
  const [copiada, setCopiada] = useState<boolean | undefined>(undefined);

  function cerrar(): void {
    setCopiada(undefined);
    alCerrar();
  }

  return (
    <HojaInferior
      abierta={porEntregar !== null}
      titulo={`Contraseña de ${porEntregar?.nombre ?? ""}`}
      alCerrar={cerrar}
    >
      {porEntregar ? (
        <div className={estilos.formulario}>
          <p className={estilos.contrasena}>{porEntregar.contrasena}</p>
          <p>
            No se vuelve a mostrar. Entrégasela a la persona por un canal privado; podrá cambiarla
            en Mi cuenta.
          </p>
          <div className={estilos.enLinea}>
            <Boton onClick={() => void copiar(porEntregar.contrasena).then(setCopiada)}>
              Copiar
            </Boton>
            <Boton variante="tinta" onClick={cerrar}>
              Ya la entregué
            </Boton>
          </div>
          <p role="status" className={estilos.estado}>
            {copiada === undefined
              ? ""
              : copiada
                ? "Copiada."
                : "No se pudo copiar. Cópiala a mano."}
          </p>
        </div>
      ) : null}
    </HojaInferior>
  );
}
