import { describe, expect, it } from "vitest";
import { vieneDeOtroSitio } from "../../src/http/origen";

const URL_PROPIA = "https://kuorum.ejemplo.edu/api/public/v1/salas/ABCD/votos";

function solicitud(cabeceras: Record<string, string>, url = URL_PROPIA): Request {
  return new Request(url, { method: "POST", headers: cabeceras });
}

describe("vieneDeOtroSitio", () => {
  it("deja pasar a un cliente sin Origin ni Sec-Fetch-Site (curl, pruebas, apps)", () => {
    expect(vieneDeOtroSitio(solicitud({}))).toBe(false);
  });

  it("deja pasar una petición del propio sitio", () => {
    expect(
      vieneDeOtroSitio(
        solicitud({ origin: "https://kuorum.ejemplo.edu", "sec-fetch-site": "same-origin" }),
      ),
    ).toBe(false);
  });

  it("rechaza Sec-Fetch-Site: cross-site aunque no haya Origin", () => {
    expect(vieneDeOtroSitio(solicitud({ "sec-fetch-site": "cross-site" }))).toBe(true);
  });

  it("rechaza un Origin ajeno aunque no haya Sec-Fetch-Site", () => {
    expect(vieneDeOtroSitio(solicitud({ origin: "https://malo.test" }))).toBe(true);
  });

  it("rechaza un sitio hermano (mismo dominio, otro subdominio)", () => {
    expect(
      vieneDeOtroSitio(
        solicitud({ origin: "https://foro.ejemplo.edu", "sec-fetch-site": "same-site" }),
      ),
    ).toBe(true);
  });

  it("rechaza Origin: null (iframes aislados, redirecciones entre sitios)", () => {
    expect(vieneDeOtroSitio(solicitud({ origin: "null" }))).toBe(true);
  });

  it("detrás de un proxy acepta el origen que coincide con Host o x-forwarded-host", () => {
    const interna = "http://127.0.0.1:3000/api/public/v1/salas/ABCD/votos";
    expect(
      vieneDeOtroSitio(
        solicitud(
          { origin: "https://kuorum.ejemplo.edu", "x-forwarded-host": "kuorum.ejemplo.edu" },
          interna,
        ),
      ),
    ).toBe(false);
    expect(
      vieneDeOtroSitio(
        solicitud({ origin: "https://kuorum.ejemplo.edu", host: "kuorum.ejemplo.edu" }, interna),
      ),
    ).toBe(false);
    expect(vieneDeOtroSitio(solicitud({ origin: "https://malo.test" }, interna))).toBe(true);
  });

  it("un puerto distinto es otro origen", () => {
    expect(vieneDeOtroSitio(solicitud({ origin: "https://kuorum.ejemplo.edu:8443" }))).toBe(true);
  });
});
