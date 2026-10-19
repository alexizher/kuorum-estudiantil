import { describe, expect, it } from "vitest";
import {
  InstantaneaDeSesion,
  SesionNoEncontrada,
  type RepositorioDeInstantaneas,
} from "@kuorum/domain";
import { ConsultarEstadoDeSesion } from "../../src/index.js";

class RepositorioEnMemoria implements RepositorioDeInstantaneas {
  constructor(private readonly instantaneas: Map<string, InstantaneaDeSesion>) {}

  async obtener(sesionId: string): Promise<InstantaneaDeSesion | null> {
    return this.instantaneas.get(sesionId) ?? null;
  }
}

const fecha = new Date("2026-10-19T12:00:00Z");

describe("ConsultarEstadoDeSesion", () => {
  it("devuelve la instantánea existente", async () => {
    const instantanea = new InstantaneaDeSesion("s-1", "EN_CURSO", 7, fecha);
    const repositorio = new RepositorioEnMemoria(new Map([["s-1", instantanea]]));

    const resultado = await new ConsultarEstadoDeSesion(repositorio).ejecutar("s-1");

    expect(resultado).toBe(instantanea);
    expect(resultado.etiqueta()).toBe("s-1-7");
  });

  it("lanza SesionNoEncontrada si el repositorio devuelve null", async () => {
    const consultar = new ConsultarEstadoDeSesion(new RepositorioEnMemoria(new Map()));

    await expect(consultar.ejecutar("s-404")).rejects.toBeInstanceOf(SesionNoEncontrada);
    await expect(consultar.ejecutar("s-404")).rejects.toMatchObject({
      codigo: "SESION_NO_ENCONTRADA",
    });
  });
});
