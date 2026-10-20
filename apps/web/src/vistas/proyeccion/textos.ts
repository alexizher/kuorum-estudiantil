import { NOMBRE_DE_MOCION, type TipoDeMocion } from "@kuorum/domain";

/** "De orden" pasa a "Moción de orden". */
export function etiquetaDeMocion(mocion: TipoDeMocion): string {
  return `Moción ${NOMBRE_DE_MOCION[mocion].toLowerCase()}`;
}

export function formatearNumero(n: number): string {
  return n.toLocaleString("es-CO");
}

export function formatearPorcentaje(porcentaje: number): string {
  return `${porcentaje.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
}

export function textoDeVotos(n: number): string {
  return `${formatearNumero(n)} ${n === 1 ? "voto" : "votos"}`;
}

/** Dirección corta para leer en voz alta o teclear: sin protocolo. */
export function direccionCorta(url: string): string {
  return url.replace(/^https?:\/\//, "");
}
