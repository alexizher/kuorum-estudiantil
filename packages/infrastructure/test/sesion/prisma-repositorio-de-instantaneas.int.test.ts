import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { InstantaneaDeSesion } from "@kuorum/domain";
import { urlDePruebas } from "../helpers/url-de-base-local.js";
import { createPrismaClient } from "../../src/prisma/create-prisma-client.js";
import { PrismaRepositorioDeInstantaneas } from "../../src/sesion/prisma-repositorio-de-instantaneas.js";

const prisma = createPrismaClient(urlDePruebas());
const repositorio = new PrismaRepositorioDeInstantaneas(prisma);

describe("PrismaRepositorioDeInstantaneas", () => {
  beforeEach(async () => {
    await prisma.sesion.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("devuelve la instantánea de una sesión existente", async () => {
    const creada = await prisma.sesion.create({
      data: { titulo: "Asamblea", codigoDeSala: "ABCD", estado: "EN_CURSO", version: 3 },
    });

    const instantanea = await repositorio.obtener(creada.id);

    expect(instantanea).toBeInstanceOf(InstantaneaDeSesion);
    expect(instantanea?.sesionId).toBe(creada.id);
    expect(instantanea?.estado).toBe("EN_CURSO");
    expect(instantanea?.version).toBe(3);
    expect(instantanea?.actualizadaEn).toEqual(creada.actualizadaEn);
  });

  it("devuelve null si la sesión no existe", async () => {
    expect(await repositorio.obtener("no-existe")).toBeNull();
  });
});
