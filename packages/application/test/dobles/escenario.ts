import {
  Pregunta,
  Sesion,
  type EstadoDePregunta,
  type EstadoDeSesion,
  type ModoDeParticipacion,
} from "@kuorum/domain";
import { GeneradorDeCodigosGuionado } from "./generador-de-codigos-guionado.js";
import { GeneradorDeIdsSecuencial } from "./generador-de-ids-secuencial.js";
import { HasheadorFalso } from "./hasheador-falso.js";
import { RelojFijo } from "./reloj-fijo.js";
import { RepositorioDeParticipantesEnMemoria } from "./repositorio-de-participantes-en-memoria.js";
import { RegistroDeVotosEnMemoria } from "./registro-de-votos-en-memoria.js";
import { RepositorioDePreguntasEnMemoria } from "./repositorio-de-preguntas-en-memoria.js";
import { RepositorioDeSolicitudesEnMemoria } from "./repositorio-de-solicitudes-en-memoria.js";
import { RepositorioDeSesionesEnMemoria } from "./repositorio-de-sesiones-en-memoria.js";
import { UnidadDeTrabajoInmediata } from "./unidad-de-trabajo-inmediata.js";

export function crearEscenario(salasFijas: string[] = []) {
  return {
    sesiones: new RepositorioDeSesionesEnMemoria(),
    participantes: new RepositorioDeParticipantesEnMemoria(),
    preguntas: new RepositorioDePreguntasEnMemoria(),
    solicitudes: new RepositorioDeSolicitudesEnMemoria(),
    votos: new RegistroDeVotosEnMemoria(),
    unidad: new UnidadDeTrabajoInmediata(),
    hasheador: new HasheadorFalso(),
    reloj: new RelojFijo(),
    ids: new GeneradorDeIdsSecuencial(),
    codigos: new GeneradorDeCodigosGuionado(salasFijas),
  };
}

export type Escenario = ReturnType<typeof crearEscenario>;

export async function sembrarSesion(
  escenario: Escenario,
  opciones: { modo?: ModoDeParticipacion; estado?: EstadoDeSesion; creadaPorId?: string } = {},
): Promise<Sesion> {
  const sesion = Sesion.reconstruir({
    id: escenario.ids.nuevo(),
    titulo: "Asamblea general",
    codigoDeSala: escenario.codigos.codigoDeSala(),
    modo: opciones.modo ?? "SALA_ABIERTA",
    estado: opciones.estado ?? "PROGRAMADA",
    segundosPorIntervencion: 180,
    version: 0,
    creadaEn: escenario.reloj.ahora(),
    creadaPorId: opciones.creadaPorId ?? null,
  });
  await escenario.sesiones.guardar(sesion);
  return sesion;
}

export async function sembrarPregunta(
  escenario: Escenario,
  sesionId: string,
  estado: EstadoDePregunta = "BORRADOR",
): Promise<Pregunta> {
  const nueva = Pregunta.nueva(
    sesionId,
    "¿Aprobamos el acta anterior?",
    ["Sí", "No", "Me abstengo"],
    escenario.ids,
  );
  const pregunta = Pregunta.reconstruir({
    id: nueva.id,
    sesionId,
    texto: nueva.texto,
    opciones: nueva.opciones,
    estado,
    abiertaEn: estado === "BORRADOR" ? null : escenario.reloj.ahora(),
    cerradaEn: estado === "CERRADA" ? escenario.reloj.ahora() : null,
    resultadoVisible: false,
  });
  await escenario.preguntas.guardar(pregunta);
  return pregunta;
}

export function opcionDe(pregunta: Pregunta, indice: number): string {
  const opcion = pregunta.opciones[indice];
  if (opcion === undefined) throw new Error(`La pregunta no tiene opción ${indice}`);
  return opcion.id;
}
