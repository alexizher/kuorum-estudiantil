// Comandos de la CLI de Prisma que se conectan a la base. generate, validate y format no la necesitan.
const COMANDOS_CON_BASE = new Set(["migrate", "db", "studio"]);

export const MENSAJE_SIN_URL =
  "Prisma: no hay URL de la base. Define DATABASE_URL_UNPOOLED (conexión directa, la que usan " +
  "las migraciones en Neon) o DATABASE_URL. Prisma no lee .env solo: exporta la variable antes " +
  "de correr el comando, por ejemplo con `set -a; source .env; set +a`.";

type Entorno = Readonly<Record<string, string | undefined>>;

/**
 * URL para prisma.config.ts. Las migraciones usan la conexión directa (sin pooler) si existe.
 * Sin URL devuelve undefined, salvo en los comandos que se conectan, donde lanza un error claro.
 */
export function urlDePrisma(entorno: Entorno, argumentos: readonly string[]): string | undefined {
  const url = entorno["DATABASE_URL_UNPOOLED"] || entorno["DATABASE_URL"] || undefined;
  if (url) return url;
  if (argumentos.some((argumento) => COMANDOS_CON_BASE.has(argumento))) {
    throw new Error(MENSAJE_SIN_URL);
  }
  return undefined;
}
