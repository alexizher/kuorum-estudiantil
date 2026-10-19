import { describe, expect, it } from "vitest";
import { ErrorDeDominio, SesionNoEncontrada } from "../src/index.js";

describe("errores de dominio", () => {
  it("SesionNoEncontrada es un ErrorDeDominio con código y mensaje", () => {
    const error = new SesionNoEncontrada("s-1");
    expect(error).toBeInstanceOf(ErrorDeDominio);
    expect(error.codigo).toBe("SESION_NO_ENCONTRADA");
    expect(error.message).toBe("Sesión s-1 no encontrada");
  });

  it("ErrorDeDominio usa el código como mensaje por defecto", () => {
    expect(new ErrorDeDominio("X").message).toBe("X");
  });
});
