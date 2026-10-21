import { describe, expect, it, vi } from "vitest";
import { LimiteDeTasa, ipDe } from "../../src/http/limite-de-tasa";

describe("LimiteDeTasa", () => {
  it("deja pasar el máximo por minuto y corta el siguiente", () => {
    let ahora = 1_000;
    const limite = new LimiteDeTasa(5, 60_000, () => ahora);
    for (let i = 0; i < 5; i += 1) expect(limite.permite("1.1.1.1")).toBe(true);
    expect(limite.permite("1.1.1.1")).toBe(false);
    expect(limite.permite("2.2.2.2")).toBe(true);
    ahora += 60_001;
    expect(limite.permite("1.1.1.1")).toBe(true);
  });

  it("olvida las ventanas vencidas", () => {
    let ahora = 0;
    const limite = new LimiteDeTasa(1, 1_000, () => ahora);
    limite.permite("a");
    ahora = 5_000;
    limite.permite("b");
    expect(limite.tamano()).toBe(1);
  });
});

describe("techo por defecto", () => {
  it("es de 1000 por minuto por IP", () => {
    const limite = new LimiteDeTasa();
    for (let i = 0; i < 1000; i += 1) expect(limite.permite("x")).toBe(true);
    expect(limite.permite("x")).toBe(false);
  });
});

describe("ipDe", () => {
  it("toma el primer valor de x-forwarded-for", () => {
    const r = new Request("http://x.test/", { headers: { "x-forwarded-for": "9.9.9.9, 8.8.8.8" } });
    expect(ipDe(r)).toBe("9.9.9.9");
  });
  it("con KUORUM_DETRAS_DE_CLOUDFLARE=1 prefiere cf-connecting-ip a x-forwarded-for", () => {
    vi.stubEnv("KUORUM_DETRAS_DE_CLOUDFLARE", "1");
    const r = new Request("http://x.test/", {
      headers: { "cf-connecting-ip": "5.5.5.5", "x-forwarded-for": "172.70.0.1" },
    });
    expect(ipDe(r)).toBe("5.5.5.5");
    vi.unstubAllEnvs();
  });
  it("sin la variable ignora cf-connecting-ip, que un cliente puede inventar", () => {
    vi.stubEnv("KUORUM_DETRAS_DE_CLOUDFLARE", "");
    const r = new Request("http://x.test/", {
      headers: { "cf-connecting-ip": "5.5.5.5", "x-forwarded-for": "172.70.0.1" },
    });
    expect(ipDe(r)).toBe("172.70.0.1");
    expect(
      ipDe(new Request("http://x.test/", { headers: { "cf-connecting-ip": "5.5.5.5" } })),
    ).toBeNull();
    vi.unstubAllEnvs();
  });
  it("cae a x-real-ip y luego a null", () => {
    expect(ipDe(new Request("http://x.test/", { headers: { "x-real-ip": "7.7.7.7" } }))).toBe(
      "7.7.7.7",
    );
    expect(ipDe(new Request("http://x.test/"))).toBeNull();
  });
});
