// Incrementa la versión de una sesión cada INTERVALO_S segundos (por defecto 10)
// durante DURACION_S segundos (por defecto, hasta que se interrumpa).
// Uso: CARGA_DATABASE_URL=... node tools/load/avanzar.mjs <sesion>
import { setTimeout as esperar } from "node:timers/promises";
import pg from "pg";
import { normalizarSslmode } from "./conexion.mjs";

const url = process.env.CARGA_DATABASE_URL;
const sesion = process.argv[2] ?? process.env.SESION;
const intervaloMs = Number(process.env.INTERVALO_S ?? 10) * 1000;
const duracionMs = Number(process.env.DURACION_S ?? 0) * 1000;
if (!url || !sesion) {
  console.error("Uso: CARGA_DATABASE_URL=... node tools/load/avanzar.mjs <sesion>");
  process.exit(1);
}

const cliente = new pg.Client({ connectionString: normalizarSslmode(url) });
await cliente.connect();
const controlador = new AbortController();
for (const senal of ["SIGINT", "SIGTERM"]) process.on(senal, () => controlador.abort());
if (duracionMs > 0) setTimeout(() => controlador.abort(), duracionMs).unref();

try {
  while (!controlador.signal.aborted) {
    const { rows } = await cliente.query(
      `UPDATE sesiones SET version = version + 1, "actualizadaEn" = now() WHERE id = $1 RETURNING version`,
      [sesion],
    );
    if (rows.length === 0) {
      console.error(`La sesión ${sesion} no existe`);
      process.exitCode = 1;
      break;
    }
    console.log(`version ${rows[0].version}`);
    await esperar(intervaloMs, undefined, { signal: controlador.signal }).catch(() => {});
  }
} finally {
  await cliente.end();
}
