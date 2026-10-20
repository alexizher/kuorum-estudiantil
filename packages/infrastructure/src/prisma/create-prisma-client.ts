import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const HOSTS_LOCALES = new Set(["localhost", "127.0.0.1", "[::1]"]);

// Postgres local no habla el protocolo HTTP/WebSocket de Neon, por eso necesita pg.
export function selectAdapterKind(databaseUrl: string): "pg" | "neon" {
  return HOSTS_LOCALES.has(new URL(databaseUrl).hostname) ? "pg" : "neon";
}

export function createPrismaClient(databaseUrl: string): PrismaClient {
  const adapter =
    selectAdapterKind(databaseUrl) === "pg"
      ? new PrismaPg({ connectionString: databaseUrl })
      : new PrismaNeon({ connectionString: databaseUrl });
  return new PrismaClient({ adapter });
}
