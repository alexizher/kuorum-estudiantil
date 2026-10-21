"use client";

import { Boton, Qr } from "@kuorum/ui";
import Link from "next/link";
import { useMemo } from "react";
import { ClienteDeMesaPorFetch } from "./cliente-de-mesa";
import estilos from "./mesa.module.css";
import { PieDeMesa } from "./pie-de-mesa";
import { enlaceDeCodigo } from "./textos";
import { useEntrega } from "./use-entrega";

interface Propiedades {
  sesion: { id: string; titulo: string; codigo: string };
  /** Para pruebas. */
  dependencias?: { fetch?: typeof globalThis.fetch; origen?: string };
}

export function EntregarEnVivo({ sesion, dependencias }: Propiedades) {
  const cliente = useMemo(
    () =>
      new ClienteDeMesaPorFetch(
        dependencias?.fetch ?? ((entrada, opciones) => fetch(entrada, opciones)),
      ),
    [dependencias],
  );
  const { actual, entregados, cargando, error, siguiente } = useEntrega(sesion.id, cliente);

  return (
    <div className={estilos.pagina}>
      <header role="banner" className={estilos.cabecera}>
        <div className={estilos.cabeceraTitulo}>
          <Link href={`/mesa/sesiones/${encodeURIComponent(sesion.id)}`} className={estilos.volver}>
            Volver a la sesión
          </Link>
          <h1 className={`titular ${estilos.tituloDeSesion}`}>Entregar códigos</h1>
          <p className={estilos.salaDeSesion}>
            {sesion.titulo}, sala <strong>{sesion.codigo}</strong>
          </p>
        </div>
      </header>
      <main className={estilos.entrega}>
        {actual === null ? (
          <p className={estilos.nota}>
            Cada persona recibe un código. Aparece uno a la vez y no vuelve a mostrarse.
          </p>
        ) : (
          <div className={estilos.codigoGrande} aria-live="polite">
            <p className={estilos.rotulo}>Código para entregar</p>
            <p className={`${estilos.codigoEnorme} num`}>{actual}</p>
            <div className={estilos.qrGrande}>
              <Qr
                valor={enlaceDeCodigo(
                  dependencias?.origen ?? window.location.origin,
                  sesion.codigo,
                  actual,
                )}
                etiqueta={`QR del código ${actual}`}
              />
            </div>
          </div>
        )}
        {error ? (
          <p role="alert" className={estilos.errorEnLinea}>
            {error}
          </p>
        ) : null}
        <Boton variante="tinta" ancho onClick={() => void siguiente()} disabled={cargando}>
          {actual === null ? "Mostrar el primer código" : "Siguiente código"}
        </Boton>
        <p className={estilos.nota}>
          Los códigos que no entregues siguen vigentes y sin usar: no se activan hasta que alguien
          los escribe.
        </p>
        <p className={`${estilos.contador} num`} role="status">
          Entregados en esta pantalla: {entregados}
        </p>
      </main>
      <PieDeMesa />
    </div>
  );
}
