"use client";

import { Boton, CampoDeTexto } from "@kuorum/ui";
import { useMemo, useState, type FormEvent } from "react";
import { CabeceraDeMesa } from "../mesa/cabecera-de-mesa";
import { PieDeMesa } from "../mesa/pie-de-mesa";
import estilos from "./administracion.module.css";
import { ClienteDeAdministracionPorFetch } from "./cliente-de-administracion";
import { ContrasenaUnaVez } from "./contrasena-una-vez";
import { TarjetaDePersona } from "./tarjeta-de-persona";
import { usePersonal } from "./use-personal";

interface Propiedades {
  /** Para pruebas; por defecto el fetch del navegador. */
  dependencias?: { fetch?: typeof globalThis.fetch };
}

export function PersonalEnVivo({ dependencias }: Propiedades) {
  const cliente = useMemo(
    () =>
      new ClienteDeAdministracionPorFetch(
        dependencias?.fetch ?? ((entrada, opciones) => fetch(entrada, opciones)),
      ),
    [dependencias],
  );
  const panel = usePersonal(cliente);
  const [correo, setCorreo] = useState("");
  const [nombre, setNombre] = useState("");

  async function alAgregar(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    if (correo.trim() === "" || nombre.trim() === "") return;
    if (await panel.agregar(correo, nombre)) {
      setCorreo("");
      setNombre("");
    }
  }

  return (
    <div className={estilos.pagina}>
      <CabeceraDeMesa titulo="Personal" actual="personal" esAdministrador />
      <main className={estilos.tablero}>
        <section aria-labelledby="titulo-agregar" className={estilos.seccion}>
          <h2 className={`titular ${estilos.subtitulo}`} id="titulo-agregar">
            Agregar persona
          </h2>
          <p className="suave">
            Encargado programa y conduce las sesiones de su cuerpo. Mesa solo las conduce. Una
            persona puede estar en varios cuerpos.
          </p>
          <form className={estilos.formulario} onSubmit={(e) => void alAgregar(e)} noValidate>
            <div className={estilos.dosColumnas}>
              <CampoDeTexto
                etiqueta="Correo"
                type="email"
                autoComplete="off"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                maxLength={200}
              />
              <CampoDeTexto
                etiqueta="Nombre"
                autoComplete="off"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                maxLength={120}
              />
            </div>
            <Boton type="submit" variante="tinta" disabled={panel.ocupado}>
              Agregar persona
            </Boton>
          </form>
        </section>
        {panel.error ? (
          <p role="alert" className={estilos.error}>
            {panel.error}
          </p>
        ) : null}
        <section aria-labelledby="titulo-personal" className={estilos.seccion}>
          <h2 className={`titular ${estilos.subtitulo}`} id="titulo-personal">
            Cuentas del personal
          </h2>
          {panel.personal === null ? (
            <p role="status">Cargando...</p>
          ) : panel.personal.length === 0 ? (
            <p className="suave">Todavía no hay cuentas del personal.</p>
          ) : (
            panel.personal.map((persona) => (
              <TarjetaDePersona
                key={persona.id}
                persona={persona}
                cuerpos={panel.cuerpos}
                panel={panel}
              />
            ))
          )}
        </section>
      </main>
      <ContrasenaUnaVez porEntregar={panel.porEntregar} alCerrar={panel.cerrarContrasena} />
      <PieDeMesa />
    </div>
  );
}
