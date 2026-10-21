"use client";

import { Boton } from "@kuorum/ui";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { clienteDeAuth } from "../../auth/cliente-de-auth";
import { ClienteDeMesaPorFetch } from "./cliente-de-mesa";
import { FormularioDeSesion } from "./formulario-de-sesion";
import { InsigniaDeCuentaDePrueba } from "./insignia-de-cuenta-de-prueba";
import { PieDeMesa } from "./pie-de-mesa";
import { ListaDeSesiones } from "./lista-de-sesiones";
import estilos from "./mesa.module.css";
import { useSesiones } from "./use-sesiones";

interface Propiedades {
  /** La cuenta es la de prueba pública: se avisa en la cabecera. */
  esDemo?: boolean;
  /** Para pruebas. */
  dependencias?: { fetch?: typeof globalThis.fetch; salir?: () => Promise<void> };
}

async function salirConBetterAuth(): Promise<void> {
  await clienteDeAuth.signOut();
}

export function MesaEnVivo({ esDemo = false, dependencias }: Propiedades) {
  const router = useRouter();
  const cliente = useMemo(
    () =>
      new ClienteDeMesaPorFetch(
        dependencias?.fetch ?? ((entrada, opciones) => fetch(entrada, opciones)),
      ),
    [dependencias],
  );
  const { sesiones, cargando, error, recargar, crear, creando, errorDeCrear } =
    useSesiones(cliente);

  async function salir(): Promise<void> {
    await (dependencias?.salir ?? salirConBetterAuth)().catch(() => undefined);
    router.push("/mesa/ingresar");
  }

  return (
    <div className={estilos.pagina}>
      <header role="banner" className={estilos.cabecera}>
        <h1 className={`titular ${estilos.tituloDeSesion}`}>Mesa</h1>
        <div className={estilos.accionesDeCabecera}>
          {esDemo ? <InsigniaDeCuentaDePrueba /> : null}
          <Boton onClick={() => void salir()}>Salir</Boton>
        </div>
      </header>
      <main className={estilos.tablero}>
        <section className={estilos.columna} aria-labelledby="titulo-sesiones">
          <h2 className={`titular ${estilos.tituloDeColumna}`} id="titulo-sesiones">
            Sesiones
          </h2>
          <ListaDeSesiones
            sesiones={sesiones}
            cargando={cargando}
            error={error}
            alReintentar={() => void recargar()}
          />
        </section>
        <section className={estilos.columna} aria-labelledby="titulo-crear">
          <h2 className={`titular ${estilos.tituloDeColumna}`} id="titulo-crear">
            Crear sesión
          </h2>
          <FormularioDeSesion crear={crear} creando={creando} error={errorDeCrear} />
        </section>
      </main>
      <PieDeMesa />
    </div>
  );
}
