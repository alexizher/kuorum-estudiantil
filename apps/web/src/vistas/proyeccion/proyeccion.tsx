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

export function Proyeccion({ vista, estado, segundosRestantes, urlDeEntrada }: Propiedades) {
  if (vista === "cargando") return <Mensaje rol="status">Cargando la sala...</Mensaje>;
  if (vista === "no-disponible" || !estado) {
    return <Mensaje>Esta sala no existe o ya terminó.</Mensaje>;
  }
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
