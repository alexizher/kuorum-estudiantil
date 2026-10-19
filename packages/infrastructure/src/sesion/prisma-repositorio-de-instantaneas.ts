import { InstantaneaDeSesion } from "@kuorum/domain";
import type { RepositorioDeInstantaneas } from "@kuorum/domain";
import type { PrismaClient } from "../generated/prisma/client.js";

export class PrismaRepositorioDeInstantaneas implements RepositorioDeInstantaneas {
  constructor(private readonly prisma: PrismaClient) {}

  async obtener(sesionId: string): Promise<InstantaneaDeSesion | null> {
    const sesion = await this.prisma.sesion.findUnique({ where: { id: sesionId } });
    if (sesion === null) return null;
    return new InstantaneaDeSesion(sesion.id, sesion.estado, sesion.version, sesion.actualizadaEn);
  }
}
