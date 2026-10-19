import { describe, expect, it, vi } from "vitest";
// @ts-expect-error script .mjs sin tipos
import { migrarSiProduccion } from "../../scripts/migrar-si-produccion.mjs";

type Resultado = { codigo: number; mensaje: string };
const migrar = migrarSiProduccion as (opciones: {
  env: Record<string, string | undefined>;
  ejecutar: () => number;
}) => Resultado;

describe("migrarSiProduccion", () => {
  it("migra cuando VERCEL_ENV es production", () => {
    const ejecutar = vi.fn(() => 0);
    const resultado = migrar({ env: { VERCEL_ENV: "production" }, ejecutar });
    expect(ejecutar).toHaveBeenCalledOnce();
    expect(resultado.codigo).toBe(0);
  });

  it("propaga el código de salida si la migración falla", () => {
    const resultado = migrar({ env: { VERCEL_ENV: "production" }, ejecutar: () => 3 });
    expect(resultado.codigo).toBe(3);
  });

  it.each(["preview", "development", "", undefined])("no migra con VERCEL_ENV=%s", (valor) => {
    const ejecutar = vi.fn(() => 0);
    const resultado = migrar({ env: { VERCEL_ENV: valor }, ejecutar });
    expect(ejecutar).not.toHaveBeenCalled();
    expect(resultado.codigo).toBe(0);
    expect(resultado.mensaje).toMatch(/no se migra/i);
  });
});
