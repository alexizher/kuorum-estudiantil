import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { leerSinEco, type EntradaDeTerminal } from "../scripts/leer-sin-eco";

class TerminalFalsa extends EventEmitter implements EntradaDeTerminal {
  readonly modos: boolean[] = [];
  setRawMode(modo: boolean) {
    this.modos.push(modo);
    return this;
  }
  setEncoding() {
    return this;
  }
  resume() {
    return this;
  }
  pause() {
    return this;
  }
  escribir(texto: string) {
    this.emit("data", texto);
  }
}

function preparar() {
  const entrada = new TerminalFalsa();
  const escrito: string[] = [];
  const salida = vi.fn((texto: string) => {
    escrito.push(texto);
  });
  return { entrada, escrito, salida };
}

describe("leerSinEco", () => {
  it("devuelve lo escrito hasta Enter sin repetirlo en la salida", async () => {
    const { entrada, escrito, salida } = preparar();
    const lectura = leerSinEco(entrada, salida, "Contraseña: ");
    entrada.escribir("secreto-");
    entrada.escribir("largo\r");
    expect(await lectura).toBe("secreto-largo");
    expect(escrito.join("")).not.toContain("secreto");
    expect(escrito[0]).toBe("Contraseña: ");
  });

  it("vuelve al modo normal de la terminal al terminar", async () => {
    const { entrada, salida } = preparar();
    const lectura = leerSinEco(entrada, salida, "> ");
    entrada.escribir("abc\n");
    await lectura;
    expect(entrada.modos).toEqual([true, false]);
    expect(entrada.listenerCount("data")).toBe(0);
  });

  it("la tecla de borrar quita el último carácter", async () => {
    const { entrada, salida } = preparar();
    const lectura = leerSinEco(entrada, salida, "> ");
    entrada.escribir("abcx\u007f\bd\r");
    expect(await lectura).toBe("abd");
  });

  it("Ctrl+C cancela, rechaza y restaura la terminal", async () => {
    const { entrada, salida } = preparar();
    const lectura = leerSinEco(entrada, salida, "> ");
    entrada.escribir("abc\u0003");
    await expect(lectura).rejects.toThrow("Cancelado");
    expect(entrada.modos).toEqual([true, false]);
  });
});
