"use client";

import { useCallback, useEffect, useState } from "react";
import { comoErrorDeMesa, type InstitucionDeMesa } from "../mesa/cliente-de-mesa";
import type { CambiosDeInstitucion, ClienteDeAdministracion } from "./cliente-de-administracion";

export interface PanelDeInstitucion {
  datos: InstitucionDeMesa | null;
  error: string | undefined;
  /** Manda solo lo que cambió. true si se guardó o no había nada que guardar. */
  guardar: (formulario: Required<CambiosDeInstitucion>) => Promise<boolean>;
  guardado: boolean;
  errorDeInstitucion: string | undefined;
  agregarCuerpo: (nombre: string) => Promise<boolean>;
  renombrarCuerpo: (id: string, nombre: string) => Promise<boolean>;
  archivarCuerpo: (id: string) => Promise<boolean>;
  errorDeCuerpos: string | undefined;
  ocupado: boolean;
}

export function useInstitucion(cliente: ClienteDeAdministracion): PanelDeInstitucion {
  const [datos, setDatos] = useState<InstitucionDeMesa | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  const [guardado, setGuardado] = useState(false);
  const [errorDeInstitucion, setErrorDeInstitucion] = useState<string | undefined>(undefined);
  const [errorDeCuerpos, setErrorDeCuerpos] = useState<string | undefined>(undefined);
  const [ocupado, setOcupado] = useState(false);

  const recargar = useCallback(async () => {
    try {
      setDatos(await cliente.leerInstitucion());
      setError(undefined);
    } catch (causa) {
      setError(comoErrorDeMesa(causa).message);
    }
  }, [cliente]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  async function ejecutar(
    accion: () => Promise<void>,
    alFallar: (mensaje: string | undefined) => void,
  ): Promise<boolean> {
    setOcupado(true);
    alFallar(undefined);
    try {
      await accion();
      await recargar();
      return true;
    } catch (causa) {
      alFallar(comoErrorDeMesa(causa).message);
      return false;
    } finally {
      setOcupado(false);
    }
  }

  async function guardar(formulario: Required<CambiosDeInstitucion>): Promise<boolean> {
    setGuardado(false);
    if (datos === null) return false;
    const actual = datos.institucion;
    const cambios = Object.fromEntries(
      (Object.keys(formulario) as (keyof CambiosDeInstitucion)[])
        .map((clave) => [clave, formulario[clave].trim()] as const)
        .filter(([clave, valor]) => valor !== actual[clave]),
    ) as CambiosDeInstitucion;
    if (Object.keys(cambios).length === 0) return true;
    const ok = await ejecutar(() => cliente.configurar(cambios), setErrorDeInstitucion);
    setGuardado(ok);
    return ok;
  }

  return {
    datos,
    error,
    guardar,
    guardado,
    errorDeInstitucion,
    agregarCuerpo: (nombre) =>
      ejecutar(() => cliente.crearCuerpo(nombre.trim()), setErrorDeCuerpos),
    renombrarCuerpo: (id, nombre) =>
      ejecutar(() => cliente.renombrarCuerpo(id, nombre.trim()), setErrorDeCuerpos),
    archivarCuerpo: (id) => ejecutar(() => cliente.archivarCuerpo(id), setErrorDeCuerpos),
    errorDeCuerpos,
    ocupado,
  };
}
