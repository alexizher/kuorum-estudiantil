import axe from "axe-core";

// jsdom no calcula estilos reales: el contraste se verifica en contraste.test.ts con los tokens.
export async function violacionesDeAxe(contenedor: HTMLElement): Promise<string[]> {
  const resultado = await axe.run(contenedor, { rules: { "color-contrast": { enabled: false } } });
  return resultado.violations.map((v) => `${v.id}: ${v.help}`);
}
