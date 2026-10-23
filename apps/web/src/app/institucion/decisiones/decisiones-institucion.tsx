import { aHoraLocal } from "@kuorum/domain";
import Link from "next/link";
import { SelectorDeTema } from "@kuorum/ui";
import estilos from "./decisiones-institucion.module.css";

export interface DecisionVisible {
  id: string;
  pregunta: string;
  enunciado: string | null;
  aprobada: boolean | null;
  indicativa: boolean;
  regla: string;
  resultado: {
    totalVotos: number;
    asistentes: number | null;
    porOpcion: { texto: string; votos: number; porcentaje: number }[];
  };
  cerradaEn: Date;
}

export interface CuerpoConDecisiones {
  id: string;
  nombre: string;
  slug: string;
  tipo: "GENERAL" | "FACULTAD";
  decisiones: DecisionVisible[];
}

export interface PropiedadesDeDecisionesInstitucion {
  institucion: { zonaHoraria: string };
  cuerpos: CuerpoConDecisiones[];
  desde: Date;
  hasta: Date;
}

function porcentual(valor: number): string {
  return `${valor.toFixed(1)}%`;
}

function etiquetaAprobada(aprobada: boolean | null, indicativa: boolean): string {
  if (indicativa) return "Indicativa";
  return aprobada === true ? "Aprobada" : aprobada === false ? "Rechazada" : "—";
}

function claseAprobada(aprobada: boolean | null, indicativa: boolean): string {
  if (indicativa) return "indicativa";
  return aprobada === true ? "aprobada" : aprobada === false ? "rechazada" : "sin-resultado";
}

export function DecisionesInstitucion({
  institucion,
  cuerpos,
  desde,
  hasta,
}: PropiedadesDeDecisionesInstitucion) {
  const zona = institucion.zonaHoraria;
  const hayDecisiones = cuerpos.some((c) => c.decisiones.length > 0);

  return (
    <main className={estilos.pagina}>
      <header className={estilos.cabecera}>
        <Link href="/" className={estilos.volver}>
          Inicio
        </Link>
        <h1 className="titular">Decisiones de la institución</h1>
        <p className="suave">
          Todas las decisiones de la asamblea general y de cada facultad
        </p>
        <p className={estilos.periodo}>
          Desde {aHoraLocal(desde, zona).fecha} hasta {aHoraLocal(hasta, zona).fecha}
        </p>
      </header>

      {hayDecisiones ? (
        <>
          {cuerpos.map((cuerpo) => (
            <section key={cuerpo.id} className={estilos.cuerpo} aria-labelledby={`cuerpo-${cuerpo.id}`}>
              <header className={estilos.cabeceraCuerpo}>
                <h2 id={`cuerpo-${cuerpo.id}`} className="titular">
                  {cuerpo.nombre}
                  <span className={`${estilos.tipo} ${cuerpo.tipo.toLowerCase()}`}>
                    {cuerpo.tipo === "GENERAL" ? "Asamblea General" : "Facultad"}
                  </span>
                </h2>
                <Link
                  href={`/calendario?cuerpo=${cuerpo.slug}`}
                  className={estilos.verCalendario}
                >
                  Ver calendario de {cuerpo.nombre}
                </Link>
              </header>

              {cuerpo.decisiones.length === 0 ? (
                <p className={estilos.sinDecisiones}>Sin decisiones en el periodo seleccionado.</p>
              ) : (
                <ul className={estilos.listaDecisiones} aria-label={`Decisiones de ${cuerpo.nombre}`}>
                  {cuerpo.decisiones.map((decision) => (
                    <li key={decision.id} className={estilos.decision}>
                      <article className={`${estilos.tarjeta} ${claseAprobada(decision.aprobada, decision.indicativa)}`}>
                        <header className={estilos.encabezadoDecision}>
                          <span className={`${estilos.etiqueta} ${claseAprobada(decision.aprobada, decision.indicativa)}`}>
                            {etiquetaAprobada(decision.aprobada, decision.indicativa)}
                          </span>
                          <time className={estilos.fecha} dateTime={decision.cerradaEn.toISOString()}>
                            {aHoraLocal(decision.cerradaEn, zona).fecha} a {aHoraLocal(decision.cerradaEn, zona).hora}
                          </time>
                        </header>

                        <p className={estilos.pregunta}>{decision.pregunta}</p>

                        {decision.enunciado && (
                          <p className={estilos.enunciado}>
                            <strong>Enunciado:</strong> {decision.enunciado}
                          </p>
                        )}

                        <div className={estilos.resultado}>
                          <div className={estilos.resumen}>
                            <span><strong>Total votos:</strong> {decision.resultado.totalVotos}</span>
                            {decision.resultado.asistentes !== null && (
                              <span><strong>Asistentes:</strong> {decision.resultado.asistentes}</span>
                            )}
                            <span><strong>Regla:</strong> {decision.regla}</span>
                          </div>

                          <table className={estilos.tabla}>
                            <thead>
                              <tr>
                                <th scope="col">Opción</th>
                                <th scope="col" style={{ textAlign: "right" }}>Votos</th>
                                <th scope="col" style={{ textAlign: "right" }}>%</th>
                              </tr>
                            </thead>
                            <tbody>
                              {decision.resultado.porOpcion.map((opcion, idx) => (
                                <tr key={idx}>
                                  <td>{opcion.texto}</td>
                                  <td style={{ textAlign: "right" }}>{opcion.votos}</td>
                                  <td style={{ textAlign: "right" }}>{porcentual(opcion.porcentaje)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <footer className={estilos.pieDecision}>
                          <a
                            href={`/api/public/v1/decisiones/${decision.id}.pdf`}
                            className={estilos.verActa}
                          >
                            Ver acta (PDF)
                          </a>
                        </footer>
                      </article>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </>
      ) : (
        <p className={estilos.sinResultados}>
          No hay decisiones publicadas en el periodo seleccionado.
        </p>
      )}

      <footer className={estilos.pie}>
        <SelectorDeTema />
      </footer>
    </main>
  );
}