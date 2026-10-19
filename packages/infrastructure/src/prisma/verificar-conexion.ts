import type { PrismaClient } from "../generated/prisma/client.js";

export async function verificarConexion(prisma: PrismaClient): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}
