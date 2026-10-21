import { Cabecera } from "./cabecera";
import { EsperandoInicio } from "./esperando-inicio";
import { Palabra } from "./palabra";
import estilos from "./proyeccion.module.css";
import { Resultados } from "./resultados";
import type { Proyeccion as EstadoDeProyeccion } from "./use-proyeccion";
import { VotacionAbierta } from "./votacion-abierta";

interface Propiedades extends EstadoDeProyeccion {
  urlDeEntrada: string;
}

function Mensaje({ children, rol }: { children: string; rol?: "status" }) {
  return (
    <section className={estilos.escena} aria-live={rol ? undefined : "polite"}>
      {rol ? (
        <p role="status" className={`titular ${estilos.mensaje}`}>
          {children}
        </p>
      ) : (
        <h1 className={`titular ${estilos.mensaje}`}>{children}</h1>
      )}
    </section>
  );
}

function SinConexion() {
  return (
    <p role="status" className={estilos.sinConexion}>
      Sin conexión, reintentando
    </p>
  );
}

export function Proyeccion(propiedades: Propiedades) {
  return (
    <>
      {propiedades.sinConexion ? <SinConexion /> : null}
      <Escena {...propiedades} />
    </>
  );
}

function Terminada({ titulo }: { titulo: string }) {
  return (
    <section
      className={`${estilos.escena} ${estilos.terminada}`}
      aria-labelledby="sesion-terminada"
    >
      <h1 id="sesion-terminada" className={`titular ${estilos.mensaje}`}>
        La sesión terminó
      </h1>
      <p className={estilos.sala}>{titulo}</p>
    </section>
  );
}

function Escena({ vista, estado, segundosRestantes, urlDeEntrada }: Propiedades) {
  if (vista === "cargando") return <Mensaje rol="status">Cargando la sala...</Mensaje>;
  if (vista === "no-disponible" || !estado) {
    return <Mensaje>Esta sala no existe o ya terminó.</Mensaje>;
  }
  if (vista === "terminada") return <Terminada titulo={estado.sala.titulo} />;
  const pregunta = estado.pregunta;
  return (
    <>
      <Cabecera
        {...(vista === "esperando" ? {} : { titulo: estado.sala.titulo })}
        asistencia={estado.asistencia}
      />
      {vista === "esperando" ? (
        <EsperandoInicio estado={estado} urlDeEntrada={urlDeEntrada} />
      ) : vista === "votacion" && pregunta ? (
        <VotacionAbierta estado={estado} pregunta={pregunta} urlDeEntrada={urlDeEntrada} />
      ) : vista === "resultados" && pregunta ? (
        <Resultados estado={estado} pregunta={pregunta} />
      ) : (
        <Palabra estado={estado} segundosRestantes={segundosRestantes} />
      )}
    </>
  );
}
