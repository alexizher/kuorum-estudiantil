import type { AdaptadorDeAutenticacion } from "@kuorum/infrastructure";
import { betterAuth } from "better-auth";

export interface OpcionesDeAutenticacion {
  adaptador: AdaptadorDeAutenticacion;
  secreto: string;
  /** Sin valor, Better Auth toma el origen de cada solicitud. */
  urlBase?: string | undefined;
}

export function crearAuth({ adaptador, secreto, urlBase }: OpcionesDeAutenticacion) {
  return betterAuth({
    database: adaptador,
    secret: secreto,
    ...(urlBase !== undefined ? { baseURL: urlBase } : {}),
    // Solo cuentas creadas por el script crear-admin o por el asistente.
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 12 },
    advanced: {
      useSecureCookies: process.env.NODE_ENV === "production",
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
      ipAddress: { disableIpTracking: true },
    },
  });
}

export type Autenticacion = ReturnType<typeof crearAuth>;

export function urlBaseDesdeEntorno(entorno: NodeJS.ProcessEnv): string | undefined {
  const explicita = entorno["BETTER_AUTH_URL"];
  if (explicita !== undefined && explicita !== "") return explicita;
  const produccion = entorno["VERCEL_PROJECT_PRODUCTION_URL"];
  return produccion !== undefined && produccion !== "" ? `https://${produccion}` : undefined;
}
