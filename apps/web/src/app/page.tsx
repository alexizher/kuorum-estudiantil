"use client";

import Link from "next/link";
import { BarraPublica } from "@/components/barra-publica";
import { FormularioDeCodigo } from "@/portada/formulario-de-codigo";
import { useEffect, useState } from "react";
import estilos from "@/portada/portada.module.css";

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

interface DatosDeEntrada {
  href: string;
  nombre: string;
  descripcion: string;
  externa?: boolean;
}

const ENTRADAS: readonly DatosDeEntrada[] = [
  {
    href: "/mesa",
    nombre: "Soy de la mesa",
    descripcion: "Crea la sesión, abre las votaciones y da la palabra.",
  },
  {
    href: "/calendario",
    nombre: "Calendario",
    descripcion: "Las sesiones programadas de la asamblea general y de cada facultad.",
  },
  {
    href: "/institucion/decisiones",
    nombre: "Decisiones",
    descripcion: "Ver todas las decisiones de la asamblea general y las facultades.",
  },
  {
    href: REPOSITORIO,
    nombre: "Repositorio",
    descripcion: "El código es abierto y está en GitHub.",
    externa: true,
  },
  {
    href: DOCUMENTACION,
    nombre: "Documentación",
    descripcion: "Cómo funciona el anonimato del voto y qué guarda el sistema.",
    externa: true,
  },
];

function Entrada({ href, nombre, descripcion, externa = false }: DatosDeEntrada) {
  const contenido = (
    <>
      <span className={`titular ${estilos.nombre}`}>
        {nombre}
        <span className={estilos.flecha} aria-hidden="true">
          {externa ? "↗" : "→"}
        </span>
      </span>
      <span className={estilos.descripcion}>{descripcion}</span>
    </>
  );
  return externa ? <a href={href}>{contenido}</a> : <Link href={href}>{contenido}</Link>;
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
    <>
      <BarraPublica actual="inicio" />
      <main className={estilos.pagina}>
        <header className={estilos.cabecera}>
          {institucion?.logoUrl ? (
            <img
              src={institucion.logoUrl}
              alt={institucion.nombre}
              className={estilos.logo}
              width={56}
              height={56}
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
          <h2 id="titulo-entrada" className={`titular ${estilos.tituloEntrada}`}>
            Entrar a una sala
          </h2>
          <FormularioDeCodigo />
        </section>

        <section className={estilos.otras} aria-labelledby="titulo-otras">
          <h2 id="titulo-otras" className={estilos.rotulo}>
            Otras entradas
          </h2>
          <nav aria-labelledby="titulo-otras">
            <ul className={estilos.enlaces}>
              {ENTRADAS.map((entrada) => (
                <li key={entrada.href}>
                  <Entrada {...entrada} />
                </li>
              ))}
            </ul>
          </nav>
        </section>

        {institucion?.pieDePagina ? (
          <footer className={estilos.pie}>
            <p>{institucion.pieDePagina}</p>
          </footer>
        ) : null}
      </main>
    </>
  );
}
