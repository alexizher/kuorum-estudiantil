import { ErrorDeDominio, InstantaneaDeSesion, SesionNoEncontrada } from "@kuorum/domain";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../src/app/api/public/v1/sesiones/[id]/estado/route";
import { contenedor } from "../src/composicion";

vi.mock("../src/composicion", () => ({ contenedor: vi.fn() }));

const CACHE_ESTADO = "public, max-age=0, s-maxage=2, stale-while-revalidate=2";
const actualizadaEn = new Date("2026-10-19T12:00:00.000Z");

function conConsulta(ejecutar: (id: string) => Promise<InstantaneaDeSesion>) {
  vi.mocked(contenedor).mockReturnValue({
    consultarEstadoDeSesion: { ejecutar },
    verificarBaseDeDatos: vi.fn(),
  } as unknown as ReturnType<typeof contenedor>);
}

function pedir(cabeceras: Record<string, string> = {}, id = "s") {
  return GET(
    new Request(`http://localhost/api/public/v1/sesiones/${id}/estado`, { headers: cabeceras }),
    {
      params: Promise.resolve({ id }),
    },
  );
}

describe("GET /api/public/v1/sesiones/[id]/estado", () => {
  beforeEach(() => {
    conConsulta(async (id) => new InstantaneaDeSesion(id, "ABIERTA", 7, actualizadaEn));
  });
  afterEach(() => vi.restoreAllMocks());

  it("200 con cuerpo, ETag y cabecera de caché", async () => {
    const respuesta = await pedir();

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("ETag")).toBe('W/"s-7"');
    expect(respuesta.headers.get("Cache-Control")).toBe(CACHE_ESTADO);
    expect(await respuesta.json()).toEqual({
      sesionId: "s",
      estado: "ABIERTA",
      version: 7,
      actualizadaEn: "2026-10-19T12:00:00.000Z",
    });
  });

  it("304 sin cuerpo si If-None-Match coincide", async () => {
    const respuesta = await pedir({ "If-None-Match": 'W/"s-7"' });

    expect(respuesta.status).toBe(304);
    expect(respuesta.headers.get("ETag")).toBe('W/"s-7"');
    expect(respuesta.headers.get("Cache-Control")).toBe(CACHE_ESTADO);
    expect(await respuesta.text()).toBe("");
  });

  it("200 si la etiqueta del cliente es vieja", async () => {
    const respuesta = await pedir({ "If-None-Match": 'W/"s-6"' });

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("ETag")).toBe('W/"s-7"');
  });

  it("404 con cuerpo y caché corta", async () => {
    conConsulta(async (id) => {
      throw new SesionNoEncontrada(id);
    });

    const respuesta = await pedir({}, "x");

    expect(respuesta.status).toBe(404);
    expect(respuesta.headers.get("Cache-Control")).toBe("public, max-age=0, s-maxage=1");
    expect(await respuesta.json()).toEqual({ error: "SESION_NO_ENCONTRADA" });
  });

  it("422 con el código de otros errores de dominio", async () => {
    conConsulta(async () => {
      throw new ErrorDeDominio("VERSION_INVALIDA");
    });

    const respuesta = await pedir();

    expect(respuesta.status).toBe(422);
    expect(await respuesta.json()).toEqual({ error: "VERSION_INVALIDA" });
  });

  it("500 ante un error genérico, sin filtrar el mensaje, y lo registra", async () => {
    const registro = vi.spyOn(console, "error").mockImplementation(() => undefined);
    conConsulta(async () => {
      throw new Error("conexión rota con secreto");
    });

    const respuesta = await pedir();

    expect(respuesta.status).toBe(500);
    expect(await respuesta.json()).toEqual({ error: "ERROR_INTERNO" });
    expect(registro).toHaveBeenCalledOnce();
  });
});
