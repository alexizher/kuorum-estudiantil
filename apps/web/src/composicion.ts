import { ConsultarEstadoDeSesion } from "@kuorum/application";
import {
  PrismaRepositorioDeInstantaneas,
  createPrismaClient,
  verificarConexion,
} from "@kuorum/infrastructure";

export interface Contenedor {
  consultarEstadoDeSesion: ConsultarEstadoDeSesion;
  verificarBaseDeDatos: () => Promise<boolean>;
}

let instancia: Contenedor | undefined;

// Se construye en el primer uso: ni el import ni `next build` necesitan DATABASE_URL.
export function contenedor(): Contenedor {
  if (instancia === undefined) {
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl === undefined || databaseUrl === "") {
      throw new Error("Falta la variable de entorno DATABASE_URL");
    }
    const prisma = createPrismaClient(databaseUrl);
    instancia = {
      consultarEstadoDeSesion: new ConsultarEstadoDeSesion(
        new PrismaRepositorioDeInstantaneas(prisma),
      ),
      verificarBaseDeDatos: async () => {
        await verificarConexion(prisma);
        return true;
      },
    };
  }
  return instancia;
}
