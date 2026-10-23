import { ErrorDeDominio } from "../errores.js";

const FORMATO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const MINUTO = 60_000;

const formateadores = new Map<string, Intl.DateTimeFormat>();

function formateador(zona: string): Intl.DateTimeFormat {
  let formato = formateadores.get(zona);
  if (formato === undefined) {
    formato = new Intl.DateTimeFormat("en-US", {
      timeZone: zona,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    formateadores.set(zona, formato);
  }
  return formato;
}

function partes(instante: Date, zona: string): Record<string, string> {
  const resultado: Record<string, string> = {};
  for (const parte of formateador(zona).formatToParts(instante))
    resultado[parte.type] = parte.value;
  return resultado;
}

/** Minutos que la zona va adelante de UTC en ese instante (Bogotá: -300). */
function desfase(instante: Date, zona: string): number {
  const p = partes(instante, zona);
  const comoUtc = Date.UTC(
    Number(p["year"]),
    Number(p["month"]) - 1,
    Number(p["day"]),
    Number(p["hour"]),
    Number(p["minute"]),
  );
  return Math.round((comoUtc - Math.floor(instante.getTime() / MINUTO) * MINUTO) / MINUTO);
}

/** "2026-11-03T14:00" en la zona dada, como instante. */
export function deHoraLocal(fechaHora: string, zona: string): Date {
  const coincidencia = FORMATO.exec(fechaHora);
  if (coincidencia === null) throw new ErrorDeDominio("FECHA_INVALIDA");
  const [anio, mes, dia, hora, minuto] = coincidencia.slice(1).map(Number) as [
    number,
    number,
    number,
    number,
    number,
  ];
  const comoUtc = Date.UTC(anio, mes - 1, dia, hora, minuto);
  const revision = new Date(comoUtc);
  if (
    hora > 23 ||
    minuto > 59 ||
    revision.getUTCFullYear() !== anio ||
    revision.getUTCMonth() !== mes - 1 ||
    revision.getUTCDate() !== dia
  ) {
    throw new ErrorDeDominio("FECHA_INVALIDA");
  }
  // Se mide dos veces: el desfase en la hora aproximada puede ser otro tras un cambio de horario.
  const aproximado = comoUtc - desfase(new Date(comoUtc), zona) * MINUTO;
  return new Date(comoUtc - desfase(new Date(aproximado), zona) * MINUTO);
}

/** Fecha y hora del instante en la zona: `{ fecha: "2026-11-03", hora: "23:30" }`. */
export function aHoraLocal(instante: Date, zona: string): { fecha: string; hora: string } {
  const p = partes(instante, zona);
  return { fecha: `${p["year"]}-${p["month"]}-${p["day"]}`, hora: `${p["hour"]}:${p["minute"]}` };
}
