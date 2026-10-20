import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../src/app/api/salud/route";
import { contenedor } from "../src/composicion";

vi.mock("../src/composicion", () => ({ contenedor: vi.fn() }));

function conBaseDeDatos(verificarBaseDeDatos: () => Promise<boolean>) {
  vi.mocked(contenedor).mockReturnValue({
    consultarEstadoDeSesion: { ejecutar: vi.fn() },
    verificarBaseDeDatos,
  } as unknown as ReturnType<typeof contenedor>);
}

describe("GET /api/salud", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("200 si la base responde", async () => {
    conBaseDeDatos(async () => true);

    const respuesta = await GET();

    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ estado: "ok", baseDeDatos: "ok" });
  });

  it("503 si la verificación devuelve false", async () => {
    conBaseDeDatos(async () => false);

    const respuesta = await GET();

    expect(respuesta.status).toBe(503);
    expect(await respuesta.json()).toEqual({ estado: "degradado", baseDeDatos: "error" });
  });

  it("503 si la verificación lanza", async () => {
    conBaseDeDatos(async () => {
      throw new Error("sin conexión");
    });

    expect((await GET()).status).toBe(503);
  });

  it("503 si la verificación tarda más de 8 s", async () => {
    vi.useFakeTimers();
    conBaseDeDatos(() => new Promise<boolean>(() => undefined));

    const pendiente = GET();
    await vi.advanceTimersByTimeAsync(8_000);
    const respuesta = await pendiente;

    expect(respuesta.status).toBe(503);
    expect(await respuesta.json()).toEqual({ estado: "degradado", baseDeDatos: "error" });
  });
});
