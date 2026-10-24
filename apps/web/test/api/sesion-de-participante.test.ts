import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cookieDeParticipante, firmar, leer, nombreDeCookie } from "@/http/sesion-de-participante";

function conCookie(valor: string, codigo = "ABCD"): Request {
  return new Request("http://x.test/", {
    headers: { cookie: `otra=1; ${nombreDeCookie(codigo)}=${valor}; z=2` },
  });
}

describe("sesión de participante", () => {
  beforeEach(() => vi.stubEnv("KUORUM_SECRETO", "secreto-de-prueba-largo-123456"));
  afterEach(() => vi.unstubAllEnvs());

  it("la cookie se llama kuorum_p_<CODIGO> y el valor es id.mac", () => {
    expect(nombreDeCookie("ABCD")).toBe("kuorum_p_ABCD");
    expect(firmar("p-1", "ABCD")).toMatch(/^p-1\.[A-Za-z0-9_-]{43}$/);
  });

  it("lee el participante de una cookie bien firmada", () => {
    expect(leer(conCookie(firmar("p-1", "ABCD")), "ABCD")).toBe("p-1");
  });

  it("rechaza una cookie alterada (id cambiado o firma cortada)", () => {
    const [, mac] = firmar("p-1", "ABCD").split(".");
    expect(leer(conCookie(`p-2.${mac}`), "ABCD")).toBeNull();
    expect(leer(conCookie(firmar("p-1", "ABCD").slice(0, -2)), "ABCD")).toBeNull();
    expect(leer(conCookie("sin-punto"), "ABCD")).toBeNull();
  });

  it("rechaza la cookie de otra sala aunque se copie bajo este nombre", () => {
    expect(leer(conCookie(firmar("p-1", "WXYZ"), "ABCD"), "ABCD")).toBeNull();
  });

  it("sin cookie da null", () => {
    expect(leer(new Request("http://x.test/"), "ABCD")).toBeNull();
  });

  it("la firma depende del secreto", () => {
    const valor = firmar("p-1", "ABCD");
    vi.stubEnv("KUORUM_SECRETO", "otro-secreto-distinto-123456789");
    expect(leer(conCookie(valor), "ABCD")).toBeNull();
  });

  it("sin KUORUM_SECRETO falla con un mensaje claro, sin secreto por defecto", () => {
    vi.stubEnv("KUORUM_SECRETO", "");
    expect(() => firmar("p-1", "ABCD")).toThrow(/KUORUM_SECRETO/);
    expect(() => leer(conCookie("a.b"), "ABCD")).toThrow(/KUORUM_SECRETO/);
  });

  it("Set-Cookie: httpOnly, SameSite=Lax, Path=/, 12 h; Secure solo en production", () => {
    const desarrollo = cookieDeParticipante("p-1", "ABCD");
    expect(desarrollo).toContain(`kuorum_p_ABCD=${firmar("p-1", "ABCD")}`);
    expect(desarrollo).toContain("HttpOnly");
    expect(desarrollo).toContain("SameSite=Lax");
    expect(desarrollo).toContain("Path=/");
    expect(desarrollo).toContain("Max-Age=43200");
    expect(desarrollo).not.toContain("Secure");

    vi.stubEnv("NODE_ENV", "production");
    expect(cookieDeParticipante("p-1", "ABCD")).toContain("Secure");
  });
});
