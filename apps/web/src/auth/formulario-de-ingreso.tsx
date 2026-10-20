"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { clienteDeAuth } from "./cliente-de-auth";
import { useIngreso, type Ingresar } from "./use-ingreso";

const ingresarConBetterAuth: Ingresar = async (correo, contrasena) => {
  const { error } = await clienteDeAuth.signIn.email({ email: correo, password: contrasena });
  return error === null;
};

export function FormularioDeIngreso() {
  const router = useRouter();
  const { error, enviando, enviar } = useIngreso(ingresarConBetterAuth, () => {
    router.push("/mesa");
  });

  function alEnviar(evento: FormEvent<HTMLFormElement>): void {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    void enviar(String(datos.get("correo") ?? ""), String(datos.get("contrasena") ?? ""));
  }

  return (
    <form onSubmit={alEnviar} aria-describedby={error ? "error-de-ingreso" : undefined}>
      <p>
        <label htmlFor="correo">Correo</label>
        <br />
        <input id="correo" name="correo" type="email" autoComplete="username" required />
      </p>
      <p>
        <label htmlFor="contrasena">Contraseña</label>
        <br />
        <input
          id="contrasena"
          name="contrasena"
          type="password"
          autoComplete="current-password"
          required
        />
      </p>
      {error ? (
        <p id="error-de-ingreso" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={enviando}>
        Entrar
      </button>
    </form>
  );
}
