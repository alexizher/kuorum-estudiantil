/**
 * Las horas viajan como hora local de la institución (`2026-11-03T14:00`): el servidor las
 * convierte. Aquí solo se arman y se muestran, sin pasar por la zona del navegador.
 */

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function dosDigitos(n: number): string {
  return String(n).padStart(2, "0");
}

function fechaDe(anio: number, mes: number, dia: number): string {
  return `${anio}-${dosDigitos(mes)}-${dosDigitos(dia)}`;
}

function diaSiguiente(fecha: string): string {
  const [anio = 0, mes = 1, dia = 1] = fecha.split("-").map(Number);
  const siguiente = new Date(Date.UTC(anio, mes - 1, dia + 1));
  return fechaDe(siguiente.getUTCFullYear(), siguiente.getUTCMonth() + 1, siguiente.getUTCDate());
}

/** Una sesión que termina a la misma hora o antes de empezar, termina al día siguiente. */
export function finLocal(fecha: string, desde: string, hasta: string): string {
  return `${hasta <= desde ? diaSiguiente(fecha) : fecha}T${hasta}`;
}

export function separar(local: string): { fecha: string; hora: string } {
  const [fecha = "", hora = ""] = local.split("T");
  return { fecha, hora };
}

/** "3 nov 2026, 23:30". */
export function fechaYHora(local: string): string {
  const { fecha, hora } = separar(local);
  const [anio, mes = 1, dia = 1] = fecha.split("-").map(Number);
  return `${dia} ${MESES[mes - 1] ?? ""} ${anio}, ${hora}`;
}

/** La próxima hora en punto del navegador, con dos horas de duración. */
export function inicioPorDefecto(ahora: Date): { fecha: string; desde: string; hasta: string } {
  const inicio = new Date(ahora);
  inicio.setMinutes(0, 0, 0);
  inicio.setHours(inicio.getHours() + 1);
  const fin = new Date(inicio);
  fin.setHours(fin.getHours() + 2);
  return {
    fecha: fechaDe(inicio.getFullYear(), inicio.getMonth() + 1, inicio.getDate()),
    desde: `${dosDigitos(inicio.getHours())}:00`,
    hasta: `${dosDigitos(fin.getHours())}:00`,
  };
}
