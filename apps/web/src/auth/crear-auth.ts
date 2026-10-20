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
      // Vercel pone la IP del cliente como primer salto de x-forwarded-for.
      ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] },
    },
    // La IP de la mesa se usa solo para limitar intentos; las votantes nunca pasan por aquí.
    rateLimit: {
      enabled: true,
      storage: "database",
      customRules: { "/sign-in/email": { window: 60, max: 5 } },
    },
    // La sesión no conserva la IP: el contador de intentos ya la usó.
    databaseHooks: {
      session: {
        create: { before: async (sesion) => ({ data: { ...sesion, ipAddress: null } }) },
      },
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
