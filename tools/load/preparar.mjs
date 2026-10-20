// Crea una sesión EN_CURSO para las pruebas de carga e imprime su id y su código de sala.
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
const INTENTOS = 10;
const codigoNuevo = () =>
  Array.from({ length: 4 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
let codigoUsado;

const cliente = new pg.Client({ connectionString: url });
await cliente.connect();
try {
  for (let intento = 1; ; intento += 1) {
    try {
      const codigo = codigoNuevo();
      await cliente.query(
        `INSERT INTO sesiones (id, titulo, "codigoDeSala", estado, version, "actualizadaEn")
         VALUES ($1, 'Sesión de carga', $2, 'EN_CURSO', 0, now())`,
        [id, codigo],
      );
      codigoUsado = codigo;
      break;
    } catch (error) {
      // 23505: el código de sala ya existe; se prueba con otro.
      if (error.code !== "23505" || intento >= INTENTOS) throw error;
    }
  }
} finally {
  await cliente.end();
}
console.log(`sesion=${id}`);
console.log(`sala=${codigoUsado}`);
