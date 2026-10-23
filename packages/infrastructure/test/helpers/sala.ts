import { randomUUID } from "node:crypto";
import {
  CodigoDeSala,
  Cuerpo,
  Pregunta,
  Sesion,
  type EstadoDePregunta,
  type EstadoDeSesion,
  type ModoDeParticipacion,
} from "@kuorum/domain";
import type { Participante } from "@kuorum/application";
import { createPrismaClient } from "../../src/prisma/create-prisma-client.js";
import { ContextoTransaccional } from "../../src/prisma/contexto-transaccional.js";
import { PrismaUnidadDeTrabajo } from "../../src/prisma/prisma-unidad-de-trabajo.js";
import { PrismaRepositorioDeSesiones } from "../../src/sesion/prisma-repositorio-de-sesiones.js";
import { PrismaRepositorioDeParticipantes } from "../../src/participantes/prisma-repositorio-de-participantes.js";
import { PrismaRepositorioDePreguntas } from "../../src/votacion/prisma-repositorio-de-preguntas.js";
import { PrismaRegistroDeVotos } from "../../src/votacion/prisma-registro-de-votos.js";
import { PrismaRepositorioDeSolicitudes } from "../../src/palabra/prisma-repositorio-de-solicitudes.js";
import { PrismaLimpiezaDeDemo } from "../../src/demo/prisma-limpieza-de-demo.js";
import { PrismaRepositorioDeCuerpos } from "../../src/institucion/prisma-repositorio-de-cuerpos.js";
import { PrismaRepositorioDeInstitucion } from "../../src/institucion/prisma-repositorio-de-institucion.js";
import { PrismaRepositorioDeMembresias } from "../../src/institucion/prisma-repositorio-de-membresias.js";
import { PrismaDirectorioDePersonal } from "../../src/institucion/prisma-directorio-de-personal.js";
import { urlDePruebas } from "./url-de-base-local.js";

export function crearBanco() {
  const prisma = createPrismaClient(urlDePruebas());
  const contexto = new ContextoTransaccional(prisma);
  return {
    prisma,
    contexto,
    unidad: new PrismaUnidadDeTrabajo(contexto),
    sesiones: new PrismaRepositorioDeSesiones(contexto),
    participantes: new PrismaRepositorioDeParticipantes(contexto),
    preguntas: new PrismaRepositorioDePreguntas(contexto),
    votos: new PrismaRegistroDeVotos(contexto),
    solicitudes: new PrismaRepositorioDeSolicitudes(contexto),
    limpieza: new PrismaLimpiezaDeDemo(contexto),
    cuerpos: new PrismaRepositorioDeCuerpos(contexto),
    institucion: new PrismaRepositorioDeInstitucion(contexto),
    membresias: new PrismaRepositorioDeMembresias(contexto),
    directorio: new PrismaDirectorioDePersonal(contexto),
  };
}

export type Banco = ReturnType<typeof crearBanco>;

const ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
let contadorDeSalas = 0;

function codigoUnico(): string {
  contadorDeSalas += 1;
  let n = contadorDeSalas;
  let resultado = "";
  for (let i = 0; i < 4; i += 1) {
    resultado = ALFABETO.charAt(n % ALFABETO.length) + resultado;
    n = Math.floor(n / ALFABETO.length);
  }
  return resultado;
}

/** El cuerpo general que crea la migración. */
export const CUERPO_GENERAL = "cuerpo-general";

export function sesionDePrueba(
  datos: {
    modo?: ModoDeParticipacion;
    estado?: EstadoDeSesion;
    version?: number;
    creadaPorId?: string;
    cuerpoId?: string;
    inicio?: Date;
    fin?: Date;
    lugar?: string;
  } = {},
): Sesion {
  const inicio = datos.inicio ?? new Date("2026-10-20T15:00:00.000Z");
  return Sesion.reconstruir({
    id: randomUUID(),
    titulo: "Asamblea general",
    codigoDeSala: CodigoDeSala.crear(codigoUnico()),
    modo: datos.modo ?? "SALA_ABIERTA",
    estado: datos.estado ?? "EN_CURSO",
    segundosPorIntervencion: 180,
    version: datos.version ?? 0,
    creadaEn: new Date("2026-10-20T15:00:00.000Z"),
    creadaPorId: datos.creadaPorId ?? null,
    cuerpoId: datos.cuerpoId ?? CUERPO_GENERAL,
    inicio,
    fin: datos.fin ?? new Date(inicio.getTime() + 2 * 3_600_000),
    modalidad: "PRESENCIAL",
    lugar: datos.lugar ?? null,
  });
}

export function preguntaDePrueba(
  sesionId: string,
  estado: EstadoDePregunta = "BORRADOR",
  textos: string[] = ["Sí", "No", "Me abstengo"],
): Pregunta {
  const pregunta = Pregunta.nueva(sesionId, "¿Aprobamos el acta anterior?", textos, {
    nuevo: () => randomUUID(),
  });
  return Pregunta.reconstruir({
    id: pregunta.id,
    sesionId,
    texto: pregunta.texto,
    opciones: pregunta.opciones,
    estado,
    abiertaEn: estado === "BORRADOR" ? null : new Date("2026-10-20T15:05:00.000Z"),
    cerradaEn: estado === "CERRADA" ? new Date("2026-10-20T15:10:00.000Z") : null,
    resultadoVisible: false,
  });
}

export function participanteDePrueba(sesionId: string, hash: string = randomUUID()): Participante {
  return {
    id: randomUUID(),
    sesionId,
    credencial: "NAVEGADOR",
    hash,
    creadoEn: new Date("2026-10-20T15:01:00.000Z"),
  };
}

export async function limpiar(banco: Banco): Promise<void> {
  await banco.prisma.sesion.deleteMany();
  await banco.prisma.cuerpo.deleteMany({ where: { tipo: "FACULTAD" } });
  await banco.prisma.user.deleteMany({
    where: { email: { endsWith: "@usuarios-de-prueba.test" } },
  });
}

export async function usuarioDePrueba(
  banco: Banco,
  rol: "SUPERADMIN" | "MESA" | "DEMO",
  nombre = `Usuario ${rol}`,
): Promise<string> {
  const id = randomUUID();
  await banco.prisma.user.create({
    data: { id, name: nombre, email: `${id}@usuarios-de-prueba.test`, rol },
  });
  return id;
}

export async function cuerpoDePrueba(banco: Banco, nombre: string): Promise<string> {
  const id = randomUUID();
  await banco.cuerpos.guardar(Cuerpo.nuevo({ id, nombre, tipo: "FACULTAD" }));
  return id;
}
