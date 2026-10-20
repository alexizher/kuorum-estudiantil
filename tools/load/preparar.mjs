// Crea una sesión EN_CURSO para las pruebas de carga e imprime su id.
// Uso: CARGA_DATABASE_URL=... node tools/load/preparar.mjs
import { randomBytes, randomInt } from "node:crypto";
import pg from "pg";

const url = process.env.CARGA_DATABASE_URL;
if (!url) {
  console.error("Falta CARGA_DATABASE_URL");
  process.exit(1);
}

const id = `carga-${randomBytes(6).toString("hex")}`;
// Mismo alfabeto que el dominio (sin 0, 1, I, L ni O).
const ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const codigoDeSala = Array.from({ length: 4 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
const cliente = new pg.Client({ connectionString: url });
await cliente.connect();
try {
  await cliente.query(
    `INSERT INTO sesiones (id, titulo, "codigoDeSala", estado, version, "actualizadaEn")
     VALUES ($1, 'Sesión de carga', $2, 'EN_CURSO', 0, now())`,
    [id, codigoDeSala],
  );
} finally {
  await cliente.end();
}
console.log(id);
