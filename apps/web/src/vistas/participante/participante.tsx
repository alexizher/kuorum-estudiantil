"use client";

import type { EstadoDeSala } from "@kuorum/contracts";
import { Pestanas, SelectorDeTema, type ElementoDePestana } from "@kuorum/ui";
import { useState, type ReactNode } from "react";
import { PanelDePalabra } from "./panel-de-palabra";
import { PanelDeVoto } from "./panel-de-voto";
import { PantallaDeCodigo } from "./pantalla-de-codigo";
import estilos from "./participante.module.css";
import { SalaNoDisponible } from "./sala-no-disponible";
import type { Ingreso } from "./use-ingreso";
import type { EstadoDeLaSala } from "./use-estado-de-sala";
import type { Palabra } from "./use-palabra";
import type { Votacion } from "./use-votacion";
import { Boton } from "@kuorum/ui";

export interface PropiedadesDeParticipante {
  codigo: string;
  ingreso: Ingreso;
  sala: EstadoDeLaSala;
  votacion: Votacion;
  palabra: Palabra;
}

type Pestana = "votar" | "palabra";

function Cabecera({ titulo, codigo }: { titulo: string | undefined; codigo: string }) {
  return (
    <header className={estilos.cabecera}>
      {titulo === undefined ? null : <p className={estilos.sesion}>{titulo}</p>}
      <div className={estilos.cabeceraFila}>
        <p className={estilos.sala}>
          Sala <strong>{codigo}</strong>
        </p>
        <SelectorDeTema />
      </div>
    </header>
  );
}

function Verificando() {
  return (
    <section className={estilos.pantalla}>
      <p role="status" className={`titular ${estilos.mensaje}`}>
        Entrando a la sala...
      </p>
    </section>
  );
}

function NoPudo({ error, alReintentar }: { error: string | undefined; alReintentar: () => void }) {
  return (
    <section className={estilos.pantalla}>
      <h1 className={`titular ${estilos.mensaje}`}>No pudimos entrar a la sala</h1>
      {error ? <p role="alert">{error}</p> : null}
      <Boton variante="tinta" ancho onClick={alReintentar}>
        Reintentar
      </Boton>
    </section>
  );
}

function pestanasDe(votacion: Votacion, palabra: Palabra): readonly ElementoDePestana[] {
  const pendienteDeVotar = votacion.abierta !== null && !votacion.yaVoto;
  const lugar = palabra.turnos.find((t) => t.lugar !== null)?.lugar ?? null;
  return [
    {
      id: "votar",
      etiqueta: "Votar",
      ...(pendienteDeVotar ? { aviso: "1", etiquetaDelAviso: "Votación abierta" } : {}),
    },
    {
      id: "palabra",
      etiqueta: "Palabra",
      ...(lugar !== null ? { aviso: String(lugar), etiquetaDelAviso: "Lugar en la fila" } : {}),
    },
  ];
}

function Paneles({
  estado,
  votacion,
  palabra,
  pestana,
}: {
  estado: EstadoDeSala | null;
  votacion: Votacion;
  palabra: Palabra;
  pestana: Pestana;
}) {
  return (
    <>
      <section
        className={estilos.panel}
        id="panel-votar"
        role="tabpanel"
        aria-labelledby="pestana-votar"
        hidden={pestana !== "votar"}
      >
        <PanelDeVoto votacion={votacion} indicativa={estado?.sala.indicativa ?? false} />
      </section>
      <section
        className={estilos.panel}
        id="panel-palabra"
        role="tabpanel"
        aria-labelledby="pestana-palabra"
        hidden={pestana !== "palabra"}
      >
        <PanelDePalabra palabra={palabra} orador={estado?.palabra.conLaPalabra ?? null} />
      </section>
    </>
  );
}

export function Participante({
  codigo,
  ingreso,
  sala,
  votacion,
  palabra,
}: PropiedadesDeParticipante) {
  const [pestana, setPestana] = useState<Pestana>("votar");
  const { fase } = ingreso;
  const disponible = sala.disponible && fase !== "no-disponible";
  const dentro = disponible && fase === "dentro";

  let contenido: ReactNode;
  if (!disponible) contenido = <SalaNoDisponible />;
  else if (fase === "verificando") contenido = <Verificando />;
  else if (fase === "no-pudo") {
    contenido = <NoPudo error={ingreso.error} alReintentar={() => void ingreso.reintentar()} />;
  } else if (fase === "pide-codigo") {
    contenido = (
      <PantallaDeCodigo
        error={ingreso.error}
        enviando={ingreso.enviando}
        alEnviar={(texto) => void ingreso.enviarCodigo(texto)}
      />
    );
  } else {
    contenido = (
      <Paneles estado={sala.estado} votacion={votacion} palabra={palabra} pestana={pestana} />
    );
  }

  return (
    <div className={estilos.app}>
      {disponible ? <Cabecera titulo={sala.estado?.sala.titulo} codigo={codigo} /> : null}
      <main>
        {sala.sinConexion ? (
          <p role="status" className={estilos.sinConexion}>
            Sin conexión, reintentando
          </p>
        ) : null}
        {contenido}
      </main>
      {dentro ? (
        <nav className={estilos.barra} aria-label="Secciones">
          <Pestanas
            etiqueta="Secciones"
            elementos={pestanasDe(votacion, palabra)}
            seleccionada={pestana}
            alSeleccionar={(id) => setPestana(id === "palabra" ? "palabra" : "votar")}
          />
        </nav>
      ) : null}
    </div>
  );
}
