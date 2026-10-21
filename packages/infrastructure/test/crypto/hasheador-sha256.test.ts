import { describe, expect, it } from "vitest";
import { HasheadorSha256 } from "../../src/crypto/hasheador-sha256.js";

describe("HasheadorSha256", () => {
  it("da el SHA-256 hexadecimal conocido", () => {
    expect(new HasheadorSha256().sha256("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("es determinista y distingue entradas", () => {
    const h = new HasheadorSha256();
    expect(h.sha256("ABCD-2345")).toBe(h.sha256("ABCD-2345"));
    expect(h.sha256("ABCD-2345")).not.toBe(h.sha256("ABCD-2346"));
  });
});
