"use client";

import { useState } from "react";

export type Ingresar = (correo: string, contrasena: string) => Promise<boolean>;

export const MENSAJE_DE_ERROR_DE_INGRESO = "Correo o contraseña incorrectos";

// La lógica del formulario vive aquí; el cliente de auth llega por parámetro.
export function useIngreso(ingresar: Ingresar, alEntrar: () => void) {
  const [error, setError] = useState<string | undefined>(undefined);
  const [enviando, setEnviando] = useState(false);

  async function enviar(correo: string, contrasena: string): Promise<void> {
    setEnviando(true);
    setError(undefined);
    const entro = await ingresar(correo, contrasena).catch(() => false);
    setEnviando(false);
    if (entro) alEntrar();
    else setError(MENSAJE_DE_ERROR_DE_INGRESO);
  }

  return { error, enviando, enviar };
}
