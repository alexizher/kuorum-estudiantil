export interface Tramo {
  inicio: Date;
  fin: Date;
}

/** Intervalos semiabiertos: una sesión que termina a las 14:00 no choca con otra que empieza a esa hora. */
export function seCruzan(a: Tramo, b: Tramo): boolean {
  return a.inicio.getTime() < b.fin.getTime() && b.inicio.getTime() < a.fin.getTime();
}
