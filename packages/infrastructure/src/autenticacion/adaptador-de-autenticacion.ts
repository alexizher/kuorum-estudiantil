import type { DBAdapterInstance } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import type { PrismaClient } from "../generated/prisma/client.js";

export type AdaptadorDeAutenticacion = DBAdapterInstance;

// Better Auth guarda sus tablas con el mismo cliente Prisma; web no importa Prisma.
export function crearAdaptadorDeAutenticacion(prisma: PrismaClient): AdaptadorDeAutenticacion {
  return prismaAdapter(prisma, { provider: "postgresql" });
}
