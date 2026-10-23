"use client";

import { Boton, CampoDeTexto } from "@kuorum/ui";
import { useState, type FormEvent } from "react";
import { clienteDeAuth } from "@/auth/cliente-de-auth";
import estilos from "./mesa.module.css";

const LARGO_MINIMO = 12;

export type Cambiar = (datos: { actual: string; nueva: string }) => Promise<{ error?: string }>;

/** Con Better Auth; cierra las sesiones abiertas en otros dispositivos. */
const cambiarConBetterAuth: Cambiar = async ({ actual, nueva }) => {
  const { error } = await clienteDeAuth.changePassword({
    currentPassword: actual,
    newPassword: nueva,
    revokeOtherSessions: true,
  });
  if (error === null) return {};
  return {
    error:
      error.code === "INVALID_PASSWORD"
        ? "La contraseña actual no es correcta."
        : (error.message ?? "No se pudo cambiar la contraseña. Inténtalo de nuevo."),
  };
};

export function CambiarContrasena({ cambiar = cambiarConBetterAuth }: { cambiar?: Cambiar }) {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [listo, setListo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function alEnviar(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    setListo(false);
    if (nueva.length < LARGO_MINIMO) {
      setError(`La contraseña nueva debe tener al menos ${LARGO_MINIMO} caracteres.`);
      return;
    }
    if (nueva !== repetida) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }
    setError(undefined);
    setEnviando(true);
    const resultado = await cambiar({ actual, nueva }).catch(() => ({
      error: "No hay conexión. Inténtalo de nuevo.",
    }));
    setEnviando(false);
    if (resultado.error !== undefined) {
      setError(resultado.error);
      return;
    }
    setActual("");
    setNueva("");
    setRepetida("");
    setListo(true);
  }

  return (
    <form className={estilos.formulario} onSubmit={(e) => void alEnviar(e)} noValidate>
      <CampoDeTexto
        etiqueta="Contraseña actual"
        type="password"
        autoComplete="current-password"
        value={actual}
        onChange={(e) => setActual(e.target.value)}
      />
      <CampoDeTexto
        etiqueta="Contraseña nueva"
        type="password"
        autoComplete="new-password"
        ayuda={`Al menos ${LARGO_MINIMO} caracteres.`}
        value={nueva}
        onChange={(e) => setNueva(e.target.value)}
      />
      <CampoDeTexto
        etiqueta="Repite la contraseña nueva"
        type="password"
        autoComplete="new-password"
        value={repetida}
        onChange={(e) => setRepetida(e.target.value)}
      />
      {error ? (
        <p role="alert" className={estilos.errorEnLinea}>
          {error}
        </p>
      ) : null}
      <p role="status">
        {listo ? "Contraseña cambiada. Las sesiones en otros dispositivos se cerraron." : ""}
      </p>
      <Boton type="submit" variante="tinta" disabled={enviando}>
        Cambiar contraseña
      </Boton>
    </form>
  );
}
