import type { AdaptadorDeAutenticacion } from "@kuorum/infrastructure";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";

export interface ConfigOAuth {
  proveedor: "microsoft" | "google";
  clientId: string;
  clientSecret: string;
}

export interface OpcionesDeAutenticacion {
  adaptador: AdaptadorDeAutenticacion;
  secreto: string;
  /** Sin valor, Better Auth toma el origen de cada solicitud. */
  urlBase?: string | undefined;
  /** Orígenes que se aceptan además de la URL base (la URL de la rama en una vista previa). */
  origenesConfiables?: readonly string[] | undefined;
  /** Configuración OAuth opcional para verificación institucional. */
  oauth?: ConfigOAuth | null;
}

/** Rutas con las que una cuenta cambiaría su contraseña, su correo o sus datos. */
const RUTAS_BLOQUEADAS_A_LA_CUENTA_DE_PRUEBA: readonly string[] = [
  "/change-password",
  "/change-email",
  "/update-user",
  "/set-password",
  "/delete-user",
  // Una sola cuenta compartida: una persona no debe sacar a las demás.
  "/revoke-sessions",
  "/revoke-other-sessions",
  "/revoke-session",
];

export const MENSAJE_DE_CUENTA_DE_PRUEBA = "La cuenta de prueba no puede cambiar sus datos.";

function crearProveedoresOAuth(oauth: ConfigOAuth | null | undefined) {
  if (!oauth) return {};
  if (oauth.proveedor === "microsoft") {
    return {
      microsoft: {
        clientId: oauth.clientId,
        clientSecret: oauth.clientSecret,
        // Microsoft Entra ID usa el endpoint de tenant
        // El tenant se puede configurar via variable de entorno o usar "common"
        tenant: process.env.MICROSOFT_TENANT_ID ?? "common",
      },
    };
  }
  if (oauth.proveedor === "google") {
    return {
      google: {
        clientId: oauth.clientId,
        clientSecret: oauth.clientSecret,
      },
    };
  }
  return {};
}

export function crearAuth({
  adaptador,
  secreto,
  urlBase,
  origenesConfiables,
  oauth,
}: OpcionesDeAutenticacion) {
  const proveedoresSociales = crearProveedoresOAuth(oauth);

  return betterAuth({
    database: adaptador,
    secret: secreto,
    ...(urlBase !== undefined ? { baseURL: urlBase } : {}),
    ...(origenesConfiables !== undefined && origenesConfiables.length > 0
      ? { trustedOrigins: [...origenesConfiables] }
      : {}),
    user: {
      additionalFields: {
        // Solo lo escribe el servidor (crear-admin); input: false impide que un cliente lo mande
        // o lo cambie, ni al registrarse ni por update-user.
        rol: { type: "string", required: false, defaultValue: "MESA", input: false },
      },
    },
    hooks: {
      // La cuenta de prueba es pública: cualquiera podría cambiarle la contraseña a los demás.
      before: createAuthMiddleware(async (ctx) => {
        if (!RUTAS_BLOQUEADAS_A_LA_CUENTA_DE_PRUEBA.includes(ctx.path)) return;
        const sesion = await getSessionFromCtx(ctx);
        if ((sesion?.user as { rol?: unknown } | undefined)?.rol === "DEMO") {
          throw new APIError("FORBIDDEN", { message: MENSAJE_DE_CUENTA_DE_PRUEBA });
        }
      }),
    },
    // Solo cuentas creadas por el script crear-admin o por el asistente.
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 12 },
    socialProviders: proveedoresSociales,
    advanced: {
      useSecureCookies: process.env.NODE_ENV === "production",
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
      // Better Auth (sin trustedProxies) acepta una cabecera solo si trae una única IP válida;
      // si x-forwarded-for trae una cadena "cliente, proxy", la descarta y prueba x-real-ip.
      // En Vercel x-forwarded-for llega con una sola IP. Si ninguna resuelve, todos los
      // intentos comparten un único cupo (ver docs/despliegue.md).
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

/** Vercel entrega los dominios sin esquema (`rama.vercel.app`). */
function conEsquema(dominio: string | undefined): string | undefined {
  if (dominio === undefined || dominio === "") return undefined;
  return /^https?:\/\//.test(dominio) ? dominio : `https://${dominio}`;
}

/**
 * URL base de Better Auth: fija el dominio de las cookies y el origen que se acepta.
 * Una vista previa usa su propio dominio (`VERCEL_URL`); si usara el de producción, sus
 * cookies y la verificación de origen apuntarían a otro sitio y el ingreso fallaría.
 */
export function urlBaseDesdeEntorno(
  entorno: Readonly<Record<string, string | undefined>>,
): string | undefined {
  const explicita = entorno["BETTER_AUTH_URL"];
  if (explicita !== undefined && explicita !== "") return explicita;
  if (entorno["VERCEL_ENV"] === "preview") return conEsquema(entorno["VERCEL_URL"]);
  return conEsquema(entorno["VERCEL_PROJECT_PRODUCTION_URL"]);
}

/**
 * Orígenes aceptados además de la URL base. Una vista previa se abre por la URL del despliegue
 * (`VERCEL_URL`, la base) o por la de su rama (`VERCEL_BRANCH_URL`); sin esta última, el
 * ingreso desde el enlace de la rama fallaría la verificación de origen.
 */
export function origenesConfiablesDesdeEntorno(
  entorno: Readonly<Record<string, string | undefined>>,
): string[] {
  if (entorno["VERCEL_ENV"] !== "preview") return [];
  const rama = conEsquema(entorno["VERCEL_BRANCH_URL"]);
  return rama === undefined ? [] : [rama];
}
