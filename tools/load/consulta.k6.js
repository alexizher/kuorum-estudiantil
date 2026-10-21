// Carga por consulta con If-None-Match.
// k6 run -e URL=https://app -e SALA=CODIGO -e VUS=300 -e DURACION=5m -e INTERVALO_S=3 tools/load/consulta.k6.js
import http from "k6/http";
import { check, sleep } from "k6";

const base = __ENV.URL;
const sala = __ENV.SALA;
const intervalo = Number(__ENV.INTERVALO_S || 3);

export const options = {
  vus: Number(__ENV.VUS || 10),
  duration: __ENV.DURACION || "1m",
};

// Cada VU tiene su propia copia del módulo, así que la etiqueta es por usuario virtual.
let etiqueta;
let primera = true;

export function setup() {
  if (!base || !sala) throw new Error("Faltan las variables URL y SALA");
}

export default function () {
  if (primera) {
    // Desfase inicial aleatorio para que los VUs no consulten todos a la vez.
    primera = false;
    sleep(Math.random() * intervalo);
  }
  const cabeceras = etiqueta ? { "If-None-Match": etiqueta } : {};
  const respuesta = http.get(`${base}/api/public/v1/salas/${sala}/estado`, {
    headers: cabeceras,
  });
  check(respuesta, { "200 o 304": (r) => r.status === 200 || r.status === 304 });
  if (respuesta.status === 200) etiqueta = respuesta.headers["Etag"];
  sleep(intervalo);
}
