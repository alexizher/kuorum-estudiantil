// Abre CONEXIONES EventSource contra la ruta de eventos y cuenta lo que llega.
// Uso: URL=https://app SESION=id CONEXIONES=300 DURACION_S=300 node tools/load/eventos.mjs
import { EventSource } from "eventsource";

const base = process.env.URL;
const sesion = process.env.SESION;
const conexiones = Number(process.env.CONEXIONES ?? 10);
const duracionMs = Number(process.env.DURACION_S ?? 60) * 1000;
if (!base || !sesion) {
  console.error("Faltan las variables URL y SESION");
  process.exit(1);
}

let abiertas = 0;
let eventos = 0;
let errores = 0;
const fuentes = [];
for (let i = 0; i < conexiones; i++) {
  const fuente = new EventSource(`${base}/api/public/v1/sesiones/${sesion}/eventos`);
  fuente.addEventListener("open", () => abiertas++);
  fuente.addEventListener("estado", () => eventos++);
  fuente.addEventListener("error", () => errores++);
  fuentes.push(fuente);
}

setTimeout(() => {
  fuentes.forEach((f) => f.close());
  console.log(JSON.stringify({ conexiones, aperturas: abiertas, eventos, errores }));
  process.exit(0);
}, duracionMs);
