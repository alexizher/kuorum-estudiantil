"use client";

import { Boton, CampoDeTexto } from "@kuorum/ui";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { CuentaDePrueba } from "./cuenta-de-prueba";
import { clienteDeAuth } from "./cliente-de-auth";
import estilos from "./ingreso.module.css";
import { useIngreso, type Ingresar } from "./use-ingreso";

const ingresarConBetterAuth: Ingresar = async (correo, contrasena) => {
  const { error } = await clienteDeAuth.signIn.email({ email: correo, password: contrasena });
  return error === null;
};

interface Propiedades {
  /** Solo con KUORUM_MODO_DEMO=1: se muestra aparte y su botón llena el formulario. */
  cuentaDePrueba?: CuentaDePrueba | undefined;
}

export function FormularioDeIngreso({ cuentaDePrueba }: Propiedades) {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const { error, enviando, enviar } = useIngreso(ingresarConBetterAuth, () => {
    router.push("/mesa");
  });

  function alEnviar(evento: FormEvent<HTMLFormElement>): void {
    evento.preventDefault();
    void enviar(correo, contrasena);
  }

  return (
    <>
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
          value={correo}
          onChange={(evento) => setCorreo(evento.target.value)}
          autoComplete="username"
          required
        />
        <CampoDeTexto
          etiqueta="Contraseña"
          id="contrasena"
          name="contrasena"
          type="password"
          value={contrasena}
          onChange={(evento) => setContrasena(evento.target.value)}
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
      {cuentaDePrueba ? (
        <section className={estilos.cuentaDePrueba} aria-labelledby="titulo-cuenta-de-prueba">
          <h2 id="titulo-cuenta-de-prueba" className={`titular ${estilos.tituloDeCuentaDePrueba}`}>
            Cuenta de prueba
          </h2>
          <dl className={estilos.datosDeCuentaDePrueba}>
            <div>
              <dt>Correo</dt>
              <dd>{cuentaDePrueba.correo}</dd>
            </div>
            <div>
              <dt>Contraseña</dt>
              <dd>{cuentaDePrueba.contrasena}</dd>
            </div>
          </dl>
          <p className={estilos.notaDeCuentaDePrueba}>
            Es pública: cualquiera puede verla. Sus sesiones se borran cada día.
          </p>
          <Boton
            type="button"
            ancho
            onClick={() => {
              setCorreo(cuentaDePrueba.correo);
              setContrasena(cuentaDePrueba.contrasena);
            }}
          >
            Usar la cuenta de prueba
          </Boton>
        </section>
      ) : null}
    </>
  );
}
