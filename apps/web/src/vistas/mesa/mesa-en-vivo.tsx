"use client";

import { Boton } from "@kuorum/ui";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { clienteDeAuth } from "../../auth/cliente-de-auth";
import { ClienteDeMesaPorFetch } from "./cliente-de-mesa";
import { FormularioDeSesion } from "./formulario-de-sesion";
import { InsigniaDeCuentaDePrueba } from "./insignia-de-cuenta-de-prueba";
import { PieDeMesa } from "./pie-de-mesa";
import { ListaDeSesiones } from "./lista-de-sesiones";
import estilos from "./mesa.module.css";
import { useCuerpos } from "./use-cuerpos";
import { useSesiones } from "./use-sesiones";

interface Propiedades {
  /** La cuenta es la de prueba pública: se avisa en la cabecera. */
  esDemo?: boolean;
  /** Solo SUPERADMIN: interruptor para ver también las sesiones de la cuenta de prueba. */
  puedeVerCuentaDePrueba?: boolean;
  /** Cuenta del personal sin membresías. */
  sinCuerpos?: boolean;
  /** Para pruebas. */
  dependencias?: { fetch?: typeof globalThis.fetch; salir?: () => Promise<void> };
}

async function salirConBetterAuth(): Promise<void> {
  await clienteDeAuth.signOut();
}

export function MesaEnVivo({
  esDemo = false,
  puedeVerCuentaDePrueba = false,
  sinCuerpos = false,
  dependencias,
}: Propiedades) {
  const [verCuentaDePrueba, setVerCuentaDePrueba] = useState(false);
  const router = useRouter();
  const cliente = useMemo(
    () =>
      new ClienteDeMesaPorFetch(
        dependencias?.fetch ?? ((entrada, opciones) => fetch(entrada, opciones)),
      ),
    [dependencias],
  );
  const { sesiones, cargando, error, recargar, crear, creando, errorDeCrear } = useSesiones(
    cliente,
    puedeVerCuentaDePrueba && verCuentaDePrueba,
  );
  const { cuerpos, cargando: cargandoCuerpos } = useCuerpos(cliente);

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
          {puedeVerCuentaDePrueba ? (
            <label className={estilos.interruptor}>
              <input
                type="checkbox"
                checked={verCuentaDePrueba}
                onChange={(evento) => setVerCuentaDePrueba(evento.target.checked)}
              />{" "}
              Mostrar sesiones de la cuenta de prueba
            </label>
          ) : null}
          <ListaDeSesiones
            sesiones={sesiones}
            cargando={cargando}
            error={error}
            alReintentar={() => void recargar()}
            sinCuerpos={sinCuerpos}
          />
        </section>
        <section className={estilos.columna} aria-labelledby="titulo-crear">
          <h2 className={`titular ${estilos.tituloDeColumna}`} id="titulo-crear">
            Crear sesión
          </h2>
          {cargandoCuerpos ? (
            <p role="status" className={estilos.vacia}>
              Cargando...
            </p>
          ) : (
            <FormularioDeSesion
              crear={crear}
              creando={creando}
              error={errorDeCrear}
              cuerpos={cuerpos}
              cliente={cliente}
            />
          )}
        </section>
      </main>
      <PieDeMesa />
    </div>
  );
}
