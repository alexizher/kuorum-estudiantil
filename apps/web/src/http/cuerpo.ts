/** Lo único que se usa de un esquema zod; evita depender de zod desde la app. */
interface Esquema<T> {
  safeParse(dato: unknown): { success: true; data: T } | { success: false };
}

/**
 * Lee y valida el JSON de la petición. `undefined` si falta, no es JSON o no cumple el
 * esquema; el llamador responde 400.
 */
export async function leerCuerpo<T>(
  solicitud: Request,
  esquema: Esquema<T>,
  opcional = false,
): Promise<T | undefined> {
  let crudo: unknown;
  try {
    const texto = await solicitud.text();
    crudo = texto === "" && opcional ? {} : JSON.parse(texto);
  } catch {
    return undefined;
  }
  const resultado = esquema.safeParse(crudo);
  return resultado.success ? resultado.data : undefined;
}
