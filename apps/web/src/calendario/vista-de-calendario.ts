import { aHoraLocal, deHoraLocal } from "@kuorum/domain";

export interface DiaDelMes<T> {
  /** `2026-11-03` en la zona de la institución. */
  fecha: string;
  /** false para los días de relleno del mes anterior o siguiente. */
  delMes: boolean;
  sesiones: T[];
}

function dosDigitos(n: number): string {
  return String(n).padStart(2, "0");
}

function partesDelMes(mes: string): [number, number] {
  const [anio = 0, numero = 1] = mes.split("-").map(Number);
  return [anio, numero];
}

/** `"2026-12"` desplazado `n` meses. */
export function mesDesplazado(mes: string, n: number): string {
  const [anio, numero] = partesDelMes(mes);
  const fecha = new Date(Date.UTC(anio, numero - 1 + n, 1));
  return `${fecha.getUTCFullYear()}-${dosDigitos(fecha.getUTCMonth() + 1)}`;
}

export function mesActual(ahora: Date, zona: string): string {
  return aHoraLocal(ahora, zona).fecha.slice(0, 7);
}

export function esMes(texto: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(texto);
}

/** De la medianoche local del día 1 a la del día 1 del mes siguiente. */
export function rangoDelMes(mes: string, zona: string): { desde: Date; hasta: Date } {
  return {
    desde: deHoraLocal(`${mes}-01T00:00`, zona),
    hasta: deHoraLocal(`${mesDesplazado(mes, 1)}-01T00:00`, zona),
  };
}

function porFecha<T extends { inicio: Date }>(
  sesiones: readonly T[],
  zona: string,
): Map<string, T[]> {
  const mapa = new Map<string, T[]>();
  for (const sesion of [...sesiones].sort((a, b) => a.inicio.getTime() - b.inicio.getTime())) {
    const fecha = aHoraLocal(sesion.inicio, zona).fecha;
    mapa.set(fecha, [...(mapa.get(fecha) ?? []), sesion]);
  }
  return mapa;
}

/** Semanas de lunes a domingo que cubren el mes, con cada sesión en el día local de su inicio. */
export function semanasDelMes<T extends { inicio: Date }>(
  mes: string,
  sesiones: readonly T[],
  zona: string,
): DiaDelMes<T>[][] {
  const [anio, numero] = partesDelMes(mes);
  const primero = new Date(Date.UTC(anio, numero - 1, 1));
  const desplazamiento = (primero.getUTCDay() + 6) % 7;
  const diasDelMes = new Date(Date.UTC(anio, numero, 0)).getUTCDate();
  const celdas = Math.ceil((desplazamiento + diasDelMes) / 7) * 7;
  const agrupadas = porFecha(sesiones, zona);
  const semanas: DiaDelMes<T>[][] = [];
  for (let i = 0; i < celdas; i += 1) {
    const dia = new Date(Date.UTC(anio, numero - 1, 1 + i - desplazamiento));
    const fecha = `${dia.getUTCFullYear()}-${dosDigitos(dia.getUTCMonth() + 1)}-${dosDigitos(dia.getUTCDate())}`;
    if (i % 7 === 0) semanas.push([]);
    semanas.at(-1)?.push({
      fecha,
      delMes: dia.getUTCMonth() === numero - 1,
      sesiones: agrupadas.get(fecha) ?? [],
    });
  }
  return semanas;
}

export function agruparPorDia<T extends { inicio: Date }>(
  sesiones: readonly T[],
  zona: string,
): { fecha: string; sesiones: T[] }[] {
  return [...porFecha(sesiones, zona)].map(([fecha, delDia]) => ({ fecha, sesiones: delDia }));
}
