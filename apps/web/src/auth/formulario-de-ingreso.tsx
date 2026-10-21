"use client";

import { Boton, CampoDeTexto } from "@kuorum/ui";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { clienteDeAuth } from "./cliente-de-auth";
import estilos from "./ingreso.module.css";
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
    <form
      className={estilos.formulario}
      onSubmit={alEnviar}
      aria-describedby={error ? "error-de-ingreso" : undefined}
    >
      <CampoDeTexto
        etiqueta="Correo"
        id="correo"
        name="correo"
        type="email"
        autoComplete="username"
        required
      />
      <CampoDeTexto
        etiqueta="Contraseña"
        id="contrasena"
        name="contrasena"
        type="password"
        autoComplete="current-password"
        required
      />
      {error ? (
        <p id="error-de-ingreso" role="alert" className={estilos.error}>
          {error}
        </p>
      ) : null}
      <Boton type="submit" variante="tinta" ancho disabled={enviando}>
        Entrar
      </Boton>
    </form>
  );
}
