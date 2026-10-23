"use client";

import { Boton } from "@kuorum/ui";
import Link from "next/link";
import { useMemo } from "react";
import { PieDeMesa } from "../mesa/pie-de-mesa";
import estilos from "./administracion.module.css";
import { ClienteDeAdministracionPorFetch } from "./cliente-de-administracion";
import { FormularioDeInstitucion } from "./formulario-de-institucion";
import { ListaDeCuerpos } from "./lista-de-cuerpos";
import { useInstitucion } from "./use-institucion";

interface Propiedades {
  /** Para pruebas; por defecto el fetch del navegador. */
  dependencias?: { fetch?: typeof globalThis.fetch };
}

export function InstitucionEnVivo({ dependencias }: Propiedades) {
  const cliente = useMemo(
    () =>
      new ClienteDeAdministracionPorFetch(
        dependencias?.fetch ?? ((entrada, opciones) => fetch(entrada, opciones)),
      ),
    [dependencias],
  );
  const panel = useInstitucion(cliente);
  const { datos } = panel;

  return (
    <div className={estilos.pagina}>
      <header role="banner" className={estilos.cabecera}>
        <Link href="/mesa" className={estilos.volver}>
          Sesiones
        </Link>
        <h1 className="titular">Institución</h1>
      </header>
      <main className={estilos.tablero}>
        {panel.error ? (
          <div role="alert" className={estilos.error}>
            <p>{panel.error}</p>
            <Boton onClick={() => window.location.reload()}>Reintentar</Boton>
          </div>
        ) : null}
        {datos === null ? (
          panel.error ? null : (
            <p role="status">Cargando...</p>
          )
        ) : (
          <>
            <section aria-labelledby="titulo-datos" className={estilos.seccion}>
              <h2 className={`titular ${estilos.subtitulo}`} id="titulo-datos">
                Datos
              </h2>
              <FormularioDeInstitucion institucion={datos.institucion} panel={panel} />
            </section>
            <section aria-labelledby="titulo-cuerpos" className={estilos.seccion}>
              <h2 className={`titular ${estilos.subtitulo}`} id="titulo-cuerpos">
                {datos.institucion.tipoDeCuerpoPlural} y asamblea general
              </h2>
              <ListaDeCuerpos
                cuerpos={datos.cuerpos}
                tipoSingular={datos.institucion.tipoDeCuerpoSingular}
                panel={panel}
              />
            </section>
          </>
        )}
      </main>
      <PieDeMesa />
    </div>
  );
}
