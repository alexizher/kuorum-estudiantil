// Crea una sesión EN_CURSO para las pruebas de carga e imprime su id.
// Uso: CARGA_DATABASE_URL=... node tools/load/preparar.mjs
import { randomBytes } from "node:crypto";
import pg from "pg";

const url = process.env.CARGA_DATABASE_URL;
if (!url) {
  console.error("Falta CARGA_DATABASE_URL");
  process.exit(1);
}

const id = `carga-${randomBytes(6).toString("hex")}`;
const cliente = new pg.Client({ connectionString: url });
await cliente.connect();
try {
  await cliente.query(
    `INSERT INTO sesiones (id, estado, version, "actualizadaEn") VALUES ($1, 'EN_CURSO', 0, now())`,
    [id],
  );
} finally {
  await cliente.end();
}
console.log(id);
