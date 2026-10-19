// Carga por consulta con If-None-Match.
// k6 run -e URL=https://app -e SESION=id -e VUS=300 -e DURACION=5m -e INTERVALO_S=3 tools/load/consulta.k6.js
import http from "k6/http";
import { check, sleep } from "k6";

const base = __ENV.URL;
const sesion = __ENV.SESION;
const intervalo = Number(__ENV.INTERVALO_S || 3);

export const options = {
  vus: Number(__ENV.VUS || 10),
  duration: __ENV.DURACION || "1m",
};

// Cada VU tiene su propia copia del módulo, así que la etiqueta es por usuario virtual.
let etiqueta;

export function setup() {
  if (!base || !sesion) throw new Error("Faltan las variables URL y SESION");
}

export default function () {
  const cabeceras = etiqueta ? { "If-None-Match": etiqueta } : {};
  const respuesta = http.get(`${base}/api/public/v1/sesiones/${sesion}/estado`, {
    headers: cabeceras,
  });
  check(respuesta, { "200 o 304": (r) => r.status === 200 || r.status === 304 });
  if (respuesta.status === 200) etiqueta = respuesta.headers["Etag"];
  sleep(intervalo);
}
