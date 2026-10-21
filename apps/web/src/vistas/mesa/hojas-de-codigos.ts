/** Códigos por hoja carta: cuadrícula de 4 columnas por 10 filas. */
export const CODIGOS_POR_HOJA = 40;

export function dividirEnHojas(codigos: readonly string[], porHoja = CODIGOS_POR_HOJA): string[][] {
  const hojas: string[][] = [];
  for (let i = 0; i < codigos.length; i += porHoja) hojas.push(codigos.slice(i, i + porHoja));
  return hojas;
}
