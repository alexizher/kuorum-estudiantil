export interface CuentaDePrueba {
  correo: string;
  contrasena: string;
}

/**
 * La cuenta de prueba pública se muestra solo con KUORUM_MODO_DEMO=1 y con correo y contraseña
 * definidos. Se llama en el servidor: las variables no llevan NEXT_PUBLIC_ y no entran al
 * paquete del navegador.
 */
export function cuentaDePruebaDesdeEntorno(
  entorno: Readonly<Record<string, string | undefined>>,
): CuentaDePrueba | undefined {
  if (entorno["KUORUM_MODO_DEMO"] !== "1") return undefined;
  const correo = entorno["KUORUM_DEMO_CORREO"];
  const contrasena = entorno["KUORUM_DEMO_CONTRASENA"];
  if (!correo || !contrasena) return undefined;
  return { correo, contrasena };
}
