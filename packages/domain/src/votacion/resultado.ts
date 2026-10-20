import { ErrorDeDominio } from "../errores.js";
import type { Pregunta } from "./pregunta.js";

export interface ResultadoPorOpcion {
  opcionId: string;
  texto: string;
  votos: number;
  porcentaje: number;
}

const SI = "sí";
const NO = "no";
const TEXTOS_SI_NO_ABSTENCION = new Set([SI, NO, "me abstengo"]);

function normalizar(texto: string): string {
  return texto.trim().toLowerCase();
}

function porcentajeDe(votos: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((votos * 1000) / total) / 10;
}

function ganadoraDe(porOpcion: ResultadoPorOpcion[]): string | null {
  const maximo = Math.max(...porOpcion.map((o) => o.votos));
  const primeras = porOpcion.filter((o) => o.votos === maximo);
  const unica = primeras.length === 1 ? primeras[0] : undefined;
  return unica?.opcionId ?? null;
}

function aprobadaDe(porOpcion: ResultadoPorOpcion[]): boolean | null {
  const textos = porOpcion.map((o) => normalizar(o.texto));
  const si = porOpcion.find((o) => normalizar(o.texto) === SI);
  const no = porOpcion.find((o) => normalizar(o.texto) === NO);
  const soloSiNoAbstencion = textos.every((t) => TEXTOS_SI_NO_ABSTENCION.has(t));
  if (!soloSiNoAbstencion || !si || !no) return null;
  return si.votos > no.votos;
}

export class Resultado {
  private constructor(
    readonly totalVotos: number,
    readonly porOpcion: readonly ResultadoPorOpcion[],
    readonly ganadora: string | null,
    readonly aprobada: boolean | null,
  ) {}

  static calcular(pregunta: Pregunta, conteos: Map<string, number>): Resultado {
    const opcionesConocidas = new Set(pregunta.opciones.map((o) => o.id));
    for (const opcionId of conteos.keys()) {
      if (!opcionesConocidas.has(opcionId)) {
        throw new ErrorDeDominio("OPCION_INVALIDA");
      }
    }
    const votosPorOpcion = pregunta.opciones.map((opcion) => ({
      opcion,
      votos: conteos.get(opcion.id) ?? 0,
    }));
    const totalVotos = votosPorOpcion.reduce((suma, { votos }) => suma + votos, 0);
    const porOpcion = votosPorOpcion.map(({ opcion, votos }) => ({
      opcionId: opcion.id,
      texto: opcion.texto,
      votos,
      porcentaje: porcentajeDe(votos, totalVotos),
    }));
    return new Resultado(totalVotos, porOpcion, ganadoraDe(porOpcion), aprobadaDe(porOpcion));
  }
}
