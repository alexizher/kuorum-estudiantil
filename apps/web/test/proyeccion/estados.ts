import type { EstadoDeSala } from "@kuorum/contracts";

export const HORA = "2026-10-22T15:00:00.000Z";

export function salaVacia(cambios: Partial<EstadoDeSala> = {}): EstadoDeSala {
  return {
    sala: {
      codigo: "K7F2",
      titulo: "Asamblea General de Estudiantes",
      estado: "EN_CURSO",
      modo: "CON_CODIGOS",
      indicativa: false,
    },
    version: 1,
    asistencia: 1284,
    pregunta: null,
    palabra: { conLaPalabra: null, fila: [] },
    horaDelServidor: HORA,
    ...cambios,
  };
}

export function preguntaAbierta(
  textos = ["Sí", "No", "Me abstengo"],
): NonNullable<EstadoDeSala["pregunta"]> {
  return {
    id: "p1",
    texto: "¿Aprueba la asamblea el pliego de exigencias?",
    estado: "ABIERTA",
    secreta: true,
    opciones: textos.map((texto, i) => ({ id: `o${i}`, texto })),
    votosEmitidos: 812,
    resultado: null,
  };
}

export function preguntaConResultado(
  votos: number[] = [742, 318, 96],
  textos = ["Sí", "No", "Me abstengo"],
  aprobada: boolean | null = true,
): NonNullable<EstadoDeSala["pregunta"]> {
  const total = votos.reduce((a, b) => a + b, 0);
  return {
    ...preguntaAbierta(textos),
    estado: "CERRADA",
    votosEmitidos: total,
    resultado: {
      totalVotos: total,
      porOpcion: textos.map((texto, i) => ({
        opcionId: `o${i}`,
        texto,
        votos: votos[i] ?? 0,
        porcentaje: Math.round(((votos[i] ?? 0) * 1000) / total) / 10,
      })),
      ganadora: "o0",
      aprobada,
    },
  };
}

export function conLaPalabra(
  inicioEn = HORA,
  segundosTotales = 180,
): NonNullable<EstadoDeSala["palabra"]["conLaPalabra"]> {
  return {
    id: "s1",
    nombre: "Valentina Ríos",
    tipo: "INTERVENCION",
    mocion: null,
    inicioEn,
    segundosTotales,
  };
}
