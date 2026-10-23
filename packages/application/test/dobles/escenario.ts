import {
  Pregunta,
  Sesion,
  type EstadoDePregunta,
  type EstadoDeSesion,
  type ModoDeParticipacion,
} from "@kuorum/domain";
import { CUENTAS_DE_DEMO, CUERPO_GENERAL } from "./actores.js";
import { GeneradorDeCodigosGuionado } from "./generador-de-codigos-guionado.js";
import { GeneradorDeIdsSecuencial } from "./generador-de-ids-secuencial.js";
import { HasheadorFalso } from "./hasheador-falso.js";
import { RelojFijo } from "./reloj-fijo.js";
import { RepositorioDeActasEnMemoria } from "./repositorio-de-actas-en-memoria.js";
import { RepositorioDeCuerposEnMemoria } from "./repositorio-de-cuerpos-en-memoria.js";
import { RepositorioDeDecisionesEnMemoria } from "./repositorio-de-decisiones-en-memoria.js";
import { RepositorioDeInstitucionEnMemoria } from "./repositorio-de-institucion-en-memoria.js";
import { RepositorioDeParticipantesEnMemoria } from "./repositorio-de-participantes-en-memoria.js";
import { RegistroDeVotosEnMemoria } from "./registro-de-votos-en-memoria.js";
import { RepositorioDePreguntasEnMemoria } from "./repositorio-de-preguntas-en-memoria.js";
import { RepositorioDeSolicitudesEnMemoria } from "./repositorio-de-solicitudes-en-memoria.js";
import { RepositorioDeSesionesEnMemoria } from "./repositorio-de-sesiones-en-memoria.js";
import { UnidadDeTrabajoInmediata } from "./unidad-de-trabajo-inmediata.js";

export function crearEscenario(salasFijas: string[] = []) {
  const sesiones = new RepositorioDeSesionesEnMemoria();
  const cuerpos = new RepositorioDeCuerposEnMemoria();
  return {
    sesiones,
    decisiones: new RepositorioDeDecisionesEnMemoria(sesiones, cuerpos),
    actas: new RepositorioDeActasEnMemoria(sesiones),
    cuerpos,
    institucion: new RepositorioDeInstitucionEnMemoria(),
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
  opciones: {
    modo?: ModoDeParticipacion;
    estado?: EstadoDeSesion;
    creadaPorId?: string;
    cuerpoId?: string;
    /** Por defecto, a la hora del reloj, por dos horas. */
    inicio?: Date;
    fin?: Date;
    titulo?: string;
  } = {},
): Promise<Sesion> {
  const inicio = opciones.inicio ?? escenario.reloj.ahora();
  const sesion = Sesion.reconstruir({
    id: escenario.ids.nuevo(),
    titulo: opciones.titulo ?? "Asamblea general",
    codigoDeSala: escenario.codigos.codigoDeSala(),
    modo: opciones.modo ?? "SALA_ABIERTA",
    estado: opciones.estado ?? "PROGRAMADA",
    segundosPorIntervencion: 180,
    version: 0,
    creadaEn: escenario.reloj.ahora(),
    creadaPorId: opciones.creadaPorId ?? null,
    creadaPorDemo: CUENTAS_DE_DEMO.includes(opciones.creadaPorId ?? ""),
    cuerpoId: opciones.cuerpoId ?? CUERPO_GENERAL,
    inicio,
    fin: opciones.fin ?? new Date(inicio.getTime() + 2 * 3_600_000),
    modalidad: "PRESENCIAL",
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
