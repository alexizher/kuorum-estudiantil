"use client";

import { Boton, HojaInferior, Pestanas, type ElementoDePestana } from "@kuorum/ui";
import { useState } from "react";
import { TEXTO_DE_ALERTA_DE_VOTOS } from "./alerta";
import { CabeceraDeSesion } from "./cabecera-de-sesion";
import type { ClienteDeMesa, ModoDeSala, ProgramacionDeSesion } from "./cliente-de-mesa";
import { FormularioDeReprogramar } from "./formulario-de-reprogramar";
import type { GestionDeSesion } from "./use-gestion-de-sesion";
import { FilaDePalabra } from "./fila-de-palabra";
import { FormularioDePreguntaNueva } from "./formulario-de-pregunta";
import { HojaDeConfirmacion } from "./hoja-de-confirmacion";
import { PieDeMesa } from "./pie-de-mesa";
import { ListaDePreguntas } from "./lista-de-preguntas";
import estilos from "./mesa.module.css";
import { SalaDeSesion } from "./sala-de-sesion";
import type { PanelDeSesion as Panel } from "./use-panel-de-sesion";
import type { Decisiones } from "./use-decisiones";
import type { FormularioDePregunta } from "./use-formulario-de-pregunta";
import { formatearNumero } from "../proyeccion/textos";
import { VotacionActual, votacionActual } from "./votacion-actual";

export interface SesionDelPanel {
  id: string;
  titulo: string;
  codigo: string;
  modo: ModoDeSala;
  estado: string;
  programacion?: ProgramacionDeSesion;
}

export interface PropiedadesDePanel {
  sesion: SesionDelPanel;
  /** Reprogramar y cancelar; sin ella no se ofrecen. */
  gestion?: { acciones: GestionDeSesion; cliente: Pick<ClienteDeMesa, "buscarCruces"> };
  panel: Panel;
  formulario: FormularioDePregunta;
  segundosRestantes: number | null;
  alCopiarEnlace: () => Promise<boolean>;
  esDemo?: boolean;
  decisiones?: Decisiones;
}

type Pestana = "fila" | "votacion" | "sala";
type Confirmacion =
  { tipo: "terminar" } | { tipo: "cancelar" } | { tipo: "anular"; preguntaId: string } | null;

export function PanelDeSesion({
  sesion,
  panel,
  formulario,
  segundosRestantes,
  alCopiarEnlace,
  esDemo = false,
  gestion,
  decisiones,
}: PropiedadesDePanel) {
  const [pestana, setPestana] = useState<Pestana>("fila");
  const [reprogramando, setReprogramando] = useState(false);
  const [confirmacion, setConfirmacion] = useState<Confirmacion>(null);
  const { estado, acciones, ocupado } = panel;
  const estadoDeSesion = estado?.sala.estado ?? sesion.estado;
  const enCurso = estadoDeSesion === "EN_CURSO";
  const asistencia = estado?.asistencia ?? null;
  const actual = votacionActual(panel.preguntas);
  const enFila = estado?.palabra.fila.length ?? 0;
  const hayVotacionAbierta = panel.preguntas.some((p) => p.estado === "ABIERTA");

  const pestanas: readonly ElementoDePestana[] = [
    {
      id: "fila",
      etiqueta: "Fila",
      ...(enFila > 0 ? { aviso: String(enFila), etiquetaDelAviso: "Personas en la fila" } : {}),
    },
    {
      id: "votacion",
      etiqueta: "Votación",
      ...(hayVotacionAbierta ? { aviso: "1", etiquetaDelAviso: "Votación abierta" } : {}),
    },
    { id: "sala", etiqueta: "Sala" },
  ];

  async function confirmar(): Promise<void> {
    const pendiente = confirmacion;
    setConfirmacion(null);
    if (pendiente?.tipo === "terminar") await acciones.terminar();
    else if (pendiente?.tipo === "cancelar") await gestion?.acciones.cancelar();
    else if (pendiente?.tipo === "anular") await acciones.anular(pendiente.preguntaId);
  }

  return (
    <div className={estilos.pagina}>
      <CabeceraDeSesion
        titulo={sesion.titulo}
        codigo={sesion.codigo}
        modo={sesion.modo}
        estado={estadoDeSesion}
        ocupado={ocupado}
        hayVotacionAbierta={hayVotacionAbierta}
        alIniciar={() => void acciones.iniciar()}
        alPedirTerminar={() => setConfirmacion({ tipo: "terminar" })}
        alCopiarEnlace={alCopiarEnlace}
        esDemo={esDemo}
        enlaceDelActa={`/mesa/sesiones/${encodeURIComponent(sesion.id)}/acta`}
        programacion={sesion.programacion}
        {...(gestion
          ? {
              alReprogramar: () => setReprogramando(true),
              alPedirCancelar: () => setConfirmacion({ tipo: "cancelar" }),
            }
          : {})}
      />
      {gestion && sesion.programacion ? (
        <HojaInferior
          abierta={reprogramando}
          titulo="Reprogramar sesión"
          alCerrar={() => setReprogramando(false)}
        >
          {reprogramando ? (
            <FormularioDeReprogramar
              sesionId={sesion.id}
              titulo={sesion.titulo}
              programacion={sesion.programacion}
              gestion={gestion.acciones}
              cliente={gestion.cliente}
              alTerminar={() => setReprogramando(false)}
            />
          ) : null}
        </HojaInferior>
      ) : null}
      {gestion?.acciones.error && !reprogramando ? (
        <div role="alert" className={estilos.alerta}>
          <p>{gestion.acciones.error}</p>
          <Boton variante="plano" onClick={gestion.acciones.descartarError}>
            Cerrar aviso
          </Boton>
        </div>
      ) : null}

      {panel.alerta ? (
        <p role="alert" className={estilos.alerta}>
          <strong>{TEXTO_DE_ALERTA_DE_VOTOS}.</strong>{" "}
          {estado?.pregunta ? (
            <>
              {formatearNumero(estado.pregunta.votosEmitidos)} votos y{" "}
              {formatearNumero(asistencia ?? 0)} códigos activados.
            </>
          ) : null}
        </p>
      ) : null}
      {panel.error ? (
        <div role="alert" className={estilos.alerta}>
          <p>{panel.error.mensaje}</p>
          <div className={estilos.accionesDeAlerta}>
            {panel.error.codigo === "CIERRE_OCUPADO" ? (
              <Boton variante="tinta" onClick={() => void panel.reintentar()} disabled={ocupado}>
                Reintentar
              </Boton>
            ) : null}
            <Boton variante="plano" onClick={panel.descartarError}>
              Cerrar aviso
            </Boton>
          </div>
        </div>
      ) : null}
      {panel.sinConexion ? (
        <p role="status" className={estilos.sinConexion}>
          Sin conexión con la sala. Lo que ves puede estar desactualizado.
        </p>
      ) : null}
      {panel.disponible ? null : (
        <p role="alert" className={estilos.alerta}>
          Esta sala ya no existe.
        </p>
      )}

      <main className={estilos.tablero}>
        <div className={estilos.pestanas}>
          <Pestanas
            etiqueta="Secciones de la mesa"
            elementos={pestanas}
            seleccionada={pestana}
            alSeleccionar={(id) => setPestana(id as Pestana)}
          />
        </div>
        <div className={estilos.columna}>
          <section
            id="panel-fila"
            role="tabpanel"
            aria-labelledby="pestana-fila"
            className={estilos.seccion}
            data-activa={pestana === "fila"}
          >
            <h2 className={`titular ${estilos.tituloDeColumna}`}>Palabra</h2>
            <FilaDePalabra
              palabra={estado?.palabra ?? { conLaPalabra: null, fila: [] }}
              segundosRestantes={segundosRestantes}
              enCurso={enCurso}
              ocupado={ocupado}
              alDarLaPalabra={(id) => void acciones.darLaPalabra(id)}
              alTerminar={() => void acciones.terminarIntervencion()}
              alSumarMinuto={() => void acciones.sumarMinuto()}
              alRechazarMocion={(id) => void acciones.rechazarMocion(id)}
            />
          </section>
        </div>
        <div className={estilos.columna}>
          <section
            id="panel-votacion"
            role="tabpanel"
            aria-labelledby="pestana-votacion"
            className={estilos.seccion}
            data-activa={pestana === "votacion"}
          >
            <h2 className={`titular ${estilos.tituloDeColumna}`}>Votación</h2>
            <VotacionActual
              pregunta={actual}
              publica={estado?.pregunta ?? null}
              asistencia={asistencia}
              ocupado={ocupado}
              alCerrar={(id) => void acciones.cerrar(id)}
              alPedirAnular={(preguntaId) => setConfirmacion({ tipo: "anular", preguntaId })}
              alProyectar={(id) => void acciones.proyectar(id)}
            />
            <h3 className={`titular ${estilos.subtitulo}`}>Preguntas</h3>
            <ListaDePreguntas
              preguntas={panel.preguntas}
              enCurso={enCurso}
              ocupado={ocupado}
              alAbrir={(id) => void acciones.abrir(id)}
              {...(decisiones ? { decisiones } : {})}
              actaFinal={estadoDeSesion === "ACTA_FINAL"}
            />
            <h3 className={`titular ${estilos.subtitulo}`}>Nueva pregunta</h3>
            <FormularioDePreguntaNueva formulario={formulario} ocupado={ocupado} />
          </section>
          <section
            id="panel-sala"
            role="tabpanel"
            aria-labelledby="pestana-sala"
            className={estilos.seccion}
            data-activa={pestana === "sala"}
          >
            <h2 className={`titular ${estilos.tituloDeColumna} ${estilos.soloMovil}`}>Sala</h2>
            <SalaDeSesion sesionId={sesion.id} modo={sesion.modo} asistencia={asistencia} />
          </section>
        </div>

        <HojaDeConfirmacion
          abierta={confirmacion?.tipo === "terminar"}
          titulo="Terminar la sesión"
          texto="Se cierra la sala: nadie podrá votar ni pedir la palabra. No se puede deshacer."
          textoDeConfirmar="Terminar sesión"
          alConfirmar={() => void confirmar()}
          alCancelar={() => setConfirmacion(null)}
        />
        <HojaDeConfirmacion
          abierta={confirmacion?.tipo === "anular"}
          titulo="Anular la votación"
          texto="La pregunta queda anulada y no cuenta como resultado. No se puede deshacer."
          textoDeConfirmar="Anular votación"
          alConfirmar={() => void confirmar()}
          alCancelar={() => setConfirmacion(null)}
        />
        <HojaDeConfirmacion
          abierta={confirmacion?.tipo === "cancelar"}
          titulo="Cancelar la sesión"
          texto="La sesión queda cancelada y sale tachada en el calendario. No se puede deshacer."
          textoDeConfirmar="Sí, cancelarla"
          alConfirmar={() => void confirmar()}
          alCancelar={() => setConfirmacion(null)}
        />
      </main>
      <PieDeMesa />
    </div>
  );
}
