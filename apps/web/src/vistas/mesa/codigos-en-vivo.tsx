"use client";

import { Boton, CampoDeTexto } from "@kuorum/ui";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { ClienteDeMesaPorFetch } from "./cliente-de-mesa";
import { PieDeMesa } from "./pie-de-mesa";
import { HojaDeCodigos } from "./hoja-de-codigos";
import estilos from "./mesa.module.css";
import { useCodigos } from "./use-codigos";

interface Propiedades {
  sesion: { id: string; titulo: string; codigo: string };
  /** Para pruebas. */
  dependencias?: { fetch?: typeof globalThis.fetch; origen?: string };
}

export function CodigosEnVivo({ sesion, dependencias }: Propiedades) {
  const cliente = useMemo(
    () =>
      new ClienteDeMesaPorFetch(
        dependencias?.fetch ?? ((entrada, opciones) => fetch(entrada, opciones)),
      ),
    [dependencias],
  );
  const { codigos, generando, error, generar, descartar } = useCodigos(sesion.id, cliente);
  const [cantidad, setCantidad] = useState("100");

  function alEnviar(evento: FormEvent<HTMLFormElement>): void {
    evento.preventDefault();
    void generar(Number(cantidad));
  }

  return (
    <div className={estilos.pagina}>
      <header role="banner" className={`${estilos.cabecera} ${estilos.noImprimir}`}>
        <div className={estilos.cabeceraTitulo}>
          <Link href={`/mesa/sesiones/${encodeURIComponent(sesion.id)}`} className={estilos.volver}>
            Volver a la sesión
          </Link>
          <h1 className={`titular ${estilos.tituloDeSesion}`}>Generar códigos</h1>
          <p className={estilos.salaDeSesion}>
            {sesion.titulo}, sala <strong>{sesion.codigo}</strong>
          </p>
        </div>
      </header>

      <main>
        <div className={`${estilos.contenidoCodigos} ${estilos.noImprimir}`}>
          {codigos === null ? (
            <form className={estilos.formulario} onSubmit={alEnviar} noValidate>
              <CampoDeTexto
                etiqueta="Cantidad de códigos"
                ayuda="De 1 a 2000. Cada uno sirve para un voto."
                type="number"
                inputMode="numeric"
                min={1}
                max={2000}
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
              />
              {error ? (
                <p role="alert" className={estilos.errorEnLinea}>
                  {error}
                </p>
              ) : null}
              <Boton type="submit" variante="tinta" disabled={generando}>
                Generar
              </Boton>
            </form>
          ) : (
            <div className={estilos.avisoDeUnaVez}>
              <p role="alert" className={estilos.alerta}>
                Estos códigos se muestran una sola vez. Imprímelos o entrégalos ahora.
              </p>
              <div className={estilos.accionesDeVotacion}>
                <Boton variante="tinta" onClick={() => window.print()}>
                  Imprimir
                </Boton>
                <Boton onClick={descartar}>Borrar de la pantalla</Boton>
              </div>
            </div>
          )}
        </div>

        {codigos === null ? null : (
          <HojaDeCodigos
            codigos={codigos}
            codigoDeSala={sesion.codigo}
            origen={dependencias?.origen ?? window.location.origin}
          />
        )}
      </main>
      <PieDeMesa />
    </div>
  );
}
