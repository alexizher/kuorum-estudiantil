import { describe, expect, it } from "vitest";
import { hayMasVotosQueCodigos } from "../../src/vistas/mesa/alerta";
import { preguntaAbierta, preguntaConResultado, salaVacia } from "../proyeccion/estados";

function conVotos(
  votosEmitidos: number,
  asistencia: number | null,
  modo: "CON_CODIGOS" | "SALA_ABIERTA" = "CON_CODIGOS",
) {
  const base = salaVacia({ asistencia });
  return {
    ...base,
    sala: { ...base.sala, modo },
    pregunta: { ...preguntaAbierta(), votosEmitidos },
  };
}

describe("hayMasVotosQueCodigos", () => {
  it("sin estado o sin pregunta no hay alerta", () => {
    expect(hayMasVotosQueCodigos(null)).toBe(false);
    expect(hayMasVotosQueCodigos(salaVacia({ pregunta: null }))).toBe(false);
  });

  it("alerta solo si los votos superan a la asistencia", () => {
    expect(hayMasVotosQueCodigos(conVotos(1285, 1284))).toBe(true);
    expect(hayMasVotosQueCodigos(conVotos(1284, 1284))).toBe(false);
    expect(hayMasVotosQueCodigos(conVotos(10, 1284))).toBe(false);
  });

  it("con cero asistentes un voto ya es alerta", () => {
    expect(hayMasVotosQueCodigos(conVotos(1, 0))).toBe(true);
  });

  it("en sala abierta no hay asistencia que comparar", () => {
    expect(hayMasVotosQueCodigos(conVotos(500, null, "SALA_ABIERTA"))).toBe(false);
  });

  it("también avisa con la votación cerrada", () => {
    const cerrada = { ...salaVacia({ asistencia: 10 }), pregunta: preguntaConResultado([8, 3, 1]) };
    expect(hayMasVotosQueCodigos(cerrada)).toBe(true);
  });
});
