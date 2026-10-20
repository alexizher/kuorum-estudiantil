import { ConsultarEstadoDeSesion } from "@kuorum/application";
import {
  PrismaRepositorioDeInstantaneas,
  crearAdaptadorDeAutenticacion,
  createPrismaClient,
  verificarConexion,
} from "@kuorum/infrastructure";
import { crearAuth, urlBaseDesdeEntorno, type Autenticacion } from "./auth/crear-auth";

export interface Contenedor {
  consultarEstadoDeSesion: ConsultarEstadoDeSesion;
  verificarBaseDeDatos: () => Promise<boolean>;
  /** Se construye en el primer uso: exige BETTER_AUTH_SECRET solo a quien la pide. */
  autenticacion: () => Autenticacion;
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
    let auth: Autenticacion | undefined;
    instancia = {
      consultarEstadoDeSesion: new ConsultarEstadoDeSesion(
        new PrismaRepositorioDeInstantaneas(prisma),
      ),
      verificarBaseDeDatos: async () => {
        await verificarConexion(prisma);
        return true;
      },
      autenticacion: () => {
        const secreto = process.env.BETTER_AUTH_SECRET;
        if (secreto === undefined || secreto === "") {
          throw new Error("Falta la variable de entorno BETTER_AUTH_SECRET");
        }
        auth ??= crearAuth({
          adaptador: crearAdaptadorDeAutenticacion(prisma),
          secreto,
          urlBase: urlBaseDesdeEntorno(process.env),
        });
        return auth;
      },
    };
  }
  return instancia;
}
