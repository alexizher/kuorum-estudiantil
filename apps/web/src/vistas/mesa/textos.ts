import type { EstadoDeSala } from "@kuorum/contracts";
import type { Modalidad, ModoDeSala, PreguntaDeMesa } from "./cliente-de-mesa";

export const ETIQUETA_DE_ESTADO_DE_SESION: Readonly<Record<string, string>> = {
  PROGRAMADA: "Programada",
  ABIERTA: "Abierta",
  EN_CURSO: "En curso",
  CERRADA: "Terminada",
  ACTA_FINAL: "Terminada",
  CANCELADA: "Cancelada",
};

export const ETIQUETA_DE_MODO: Readonly<Record<ModoDeSala, string>> = {
  CON_CODIGOS: "Con códigos",
  SALA_ABIERTA: "Sala abierta",
};

export const ETIQUETA_DE_MODALIDAD: Readonly<Record<Modalidad, string>> = {
  PRESENCIAL: "Presencial",
  VIRTUAL: "Virtual",
  MIXTA: "Mixta",
};

export const EXPLICACION_DE_MODO: Readonly<Record<ModoDeSala, string>> = {
  CON_CODIGOS: "Un voto por código, para decisiones.",
  SALA_ABIERTA: "Un voto por navegador, votación indicativa.",
};

export const ETIQUETA_DE_PREGUNTA: Readonly<Record<PreguntaDeMesa["estado"], string>> = {
  BORRADOR: "Borrador",
  ABIERTA: "Abierta",
  CERRADA: "Cerrada",
  ANULADA: "Anulada",
};

export function etiquetaDeEstadoDeSesion(estado: EstadoDeSala["sala"]["estado"] | string): string {
  return ETIQUETA_DE_ESTADO_DE_SESION[estado] ?? estado;
}

export function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Bogota",
  });
}

export function personas(n: number): string {
  return `${n.toLocaleString("es-CO")} ${n === 1 ? "persona" : "personas"}`;
}

export function enlaceParaParticipantes(origen: string, codigoDeSala: string): string {
  return `${origen}/s/${encodeURIComponent(codigoDeSala)}`;
}

/** Lo que lleva el QR de cada código: entra a la sala con el código ya escrito. */
export function enlaceDeCodigo(origen: string, codigoDeSala: string, codigo: string): string {
  return `${enlaceParaParticipantes(origen, codigoDeSala)}?c=${encodeURIComponent(codigo)}`;
}
