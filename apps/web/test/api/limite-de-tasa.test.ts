import { describe, expect, it, vi } from "vitest";
import {
  LimiteDeTasa,
  MAXIMO_DE_CLAVES,
  MAXIMO_DE_INGRESOS_POR_NAVEGADOR,
  ipDe,
} from "../../src/http/limite-de-tasa";

describe("tope de claves del mapa", () => {
  it("es de 10.000 claves", () => {
    expect(MAXIMO_DE_CLAVES).toBe(10_000);
  });

  it("no crece sin límite aunque cada petición traiga una IP inventada distinta", () => {
    const limite = new LimiteDeTasa(5, 60_000, () => 0);
    for (let i = 0; i < MAXIMO_DE_CLAVES * 3; i += 1) limite.permite(`ip-${i}`);
    expect(limite.tamano()).toBe(MAXIMO_DE_CLAVES);
  });

  it("con el mapa lleno expulsa la clave más vieja y conserva las recientes", () => {
    const limite = new LimiteDeTasa(1, 60_000, () => 0, 3);
    for (const clave of ["a", "b", "c"]) expect(limite.permite(clave)).toBe(true);
    expect(limite.permite("d")).toBe(true);
    expect(limite.tamano()).toBe(3);
    // "a" se olvidó: vuelve a empezar su cuenta. "d" sigue contada.
    expect(limite.permite("d")).toBe(false);
    expect(limite.permite("a")).toBe(true);
  });

  it("antes de expulsar una clave viva borra las vencidas", () => {
    let ahora = 0;
    const limite = new LimiteDeTasa(1, 1_000, () => ahora, 2);
    limite.permite("a");
    ahora = 600;
    limite.permite("b");
    ahora = 1_200; // "a" venció, "b" no
    limite.permite("c");
    expect(limite.tamano()).toBe(2);
    expect(limite.permite("b")).toBe(false);
  });

  it("una clave con la ventana vencida empieza una cuenta nueva", () => {
    let ahora = 0;
    const limite = new LimiteDeTasa(1, 1_000, () => ahora);
    expect(limite.permite("a")).toBe(true);
    ahora = 1_000;
    expect(limite.permite("a")).toBe(true);
    expect(limite.permite("a")).toBe(false);
  });
});

describe("ingresos con token de navegador", () => {
  it("el techo por IP es de 300 por minuto", () => {
    expect(MAXIMO_DE_INGRESOS_POR_NAVEGADOR).toBe(300);
  });
});

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
