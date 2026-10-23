"use client";

import { SelectorDeTema } from "@kuorum/ui";
import Link from "next/link";
import { FormularioDeCodigo } from "../portada/formulario-de-codigo";
import { useEffect, useState } from "react";
import estilos from "../portada/portada.module.css";

const REPOSITORIO = "https://github.com/alexizher/kuorum-estudiantil";
const DOCUMENTACION = `${REPOSITORIO}/tree/main/docs`;

interface InstitucionData {
  nombre: string;
  logoUrl: string | null;
  colorPrimario: string | null;
  colorSecundario: string | null;
  pieDePagina: string | null;
  textoBienvenida: string | null;
}

export default function Inicio() {
  const [institucion, setInstitucion] = useState<InstitucionData | null>(null);

  useEffect(() => {
    fetch("/api/public/v1/institucion")
      .then((res) => res.json())
      .then((data: InstitucionData) => setInstitucion(data))
      .catch(() => {
        // Silently ignore errors
      });
  }, []);

  return (
    <main className={estilos.pagina}>
      <header className={estilos.cabecera}>
        {institucion?.logoUrl ? (
          <img
            src={institucion.logoUrl}
            alt={institucion.nombre}
            className={estilos.logo}
            width={48}
            height={48}
          />
        ) : null}
        <h1 className={`titular ${estilos.marca}`}>
          {institucion?.nombre ?? "Kuorum"} <span>Estudiantil</span>
        </h1>
        <p className={estilos.intro}>
          {institucion?.textoBienvenida ??
            "Votación secreta y turnos de palabra para asambleas estudiantiles. La mesa modera desde su panel, el auditorio ve la proyección y cada persona participa desde su celular."}
        </p>
      </header>

      <section className={estilos.entrada} aria-labelledby="titulo-entrada">
        <h2 id="titulo-entrada" className="titular">
          Entrar a una sala
        </h2>
        <FormularioDeCodigo />
      </section>

      <nav className={estilos.enlaces} aria-label="Otras entradas">
        <ul>
          <li>
            <Link href="/mesa">
              <span className={`titular ${estilos.nombre}`}>Soy de la mesa</span>
              <span className={estilos.descripcion}>
                Crea la sesión, abre las votaciones y da la palabra.
              </span>
            </Link>
          </li>
          <li>
            <Link href="/calendario">
              <span className={`titular ${estilos.nombre}`}>Calendario</span>
              <span className={estilos.descripcion}>
                Las sesiones programadas de la asamblea general y de cada facultad.
              </span>
            </Link>
          </li>
          <li>
            <Link href="/institucion/decisiones">
              <span className={`titular ${estilos.nombre}`}>Decisiones</span>
              <span className={estilos.descripcion}>
                Ver todas las decisiones de la asamblea general y las facultades.
              </span>
            </Link>
          </li>
          <li>
            <a href={REPOSITORIO}>
              <span className={`titular ${estilos.nombre}`}>Repositorio</span>
              <span className={estilos.descripcion}>El código es abierto y está en GitHub.</span>
            </a>
          </li>
          <li>
            <a href={DOCUMENTACION}>
              <span className={`titular ${estilos.nombre}`}>Documentación</span>
              <span className={estilos.descripcion}>
                Cómo funciona el anonimato del voto y qué guarda el sistema.
              </span>
            </a>
          </li>
        </ul>
      </nav>

      <footer className={estilos.pie}>
        {institucion?.pieDePagina && <p className={estilos.pieTexto}>{institucion.pieDePagina}</p>}
        <SelectorDeTema />
      </footer>
    </main>
  );
}