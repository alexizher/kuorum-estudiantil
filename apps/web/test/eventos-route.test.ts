import { InstantaneaDeSesion, SesionNoEncontrada } from "@kuorum/domain";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, maxDuration } from "../src/app/api/public/v1/sesiones/[id]/eventos/route";
import { contenedor } from "../src/composicion";

vi.mock("../src/composicion", () => ({ contenedor: vi.fn() }));

const actualizadaEn = new Date("2026-10-19T12:00:00.000Z");

function conConsulta(ejecutar: (id: string) => Promise<InstantaneaDeSesion>) {
  vi.mocked(contenedor).mockReturnValue({
    consultarEstadoDeSesion: { ejecutar },
    verificarBaseDeDatos: vi.fn(),
  } as unknown as ReturnType<typeof contenedor>);
}

function bloque(version: number, prefijo = ""): string {
  const cuerpo = {
    sesionId: "s",
    estado: "EN_CURSO",
    version,
    actualizadaEn: actualizadaEn.toISOString(),
  };
  return `${prefijo}event: estado\ndata: ${JSON.stringify(cuerpo)}\n\n`;
}

function lectorDe(respuesta: Response) {
  if (respuesta.body === null) throw new Error("la respuesta no tiene cuerpo");
  return respuesta.body.getReader();
}

// Lee hasta el cierre; los ping intermedios no cuentan.
async function cerrado(lector: ReturnType<typeof lectorDe>): Promise<boolean> {
  for (let i = 0; i < 100; i++) {
    if ((await lector.read()).done) return true;
  }
  return false;
}

function pedir(controlador = new AbortController(), id = "s") {
  return GET(
    new Request(`http://localhost/api/public/v1/sesiones/${id}/eventos`, {
      signal: controlador.signal,
    }),
    { params: Promise.resolve({ id }) },
  );
}

describe("GET /api/public/v1/sesiones/[id]/eventos", () => {
  let version: number;

  beforeEach(() => {
    vi.useFakeTimers();
    version = 1;
    conConsulta(async (id) => new InstantaneaDeSesion(id, "EN_CURSO", version, actualizadaEn));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("declara 300 s de duración máxima", () => {
    expect(maxDuration).toBe(300);
  });

  it("el primer bloque es event: estado con la instantánea", async () => {
    const respuesta = await pedir();
    const lector = lectorDe(respuesta);
    const decodificador = new TextDecoder();

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("Content-Type")).toBe("text/event-stream");
    expect(respuesta.headers.get("Cache-Control")).toContain("no-cache");
    const primero = await lector.read();
    expect(decodificador.decode(primero.value)).toBe(bloque(1, "retry: 3000\n"));
    await lector.cancel();
  });

  it("emite otro bloque solo cuando cambia la versión", async () => {
    const respuesta = await pedir();
    const lector = lectorDe(respuesta);
    const decodificador = new TextDecoder();
    await lector.read();

    await vi.advanceTimersByTimeAsync(3000);
    version = 2;
    await vi.advanceTimersByTimeAsync(1000);
    const segundo = await lector.read();

    expect(decodificador.decode(segundo.value)).toBe(bloque(2));
    await lector.cancel();
  });

  it("cierra el flujo a los 290 s", async () => {
    const respuesta = await pedir();
    const lector = lectorDe(respuesta);
    await lector.read();

    await vi.advanceTimersByTimeAsync(290_000);

    expect(await cerrado(lector)).toBe(true);
  });

  it("deja de consultar cuando el cliente se desconecta", async () => {
    const ejecutar = vi.fn(
      async (id: string) => new InstantaneaDeSesion(id, "EN_CURSO", 1, actualizadaEn),
    );
    conConsulta(ejecutar);
    const controlador = new AbortController();
    const respuesta = await pedir(controlador);
    await lectorDe(respuesta).read();
    await vi.advanceTimersByTimeAsync(2000);
    const antes = ejecutar.mock.calls.length;

    controlador.abort();
    await vi.advanceTimersByTimeAsync(5000);

    expect(ejecutar.mock.calls.length).toBe(antes);
  });

  it("404 si la sesión no existe", async () => {
    conConsulta(async (id) => {
      throw new SesionNoEncontrada(id);
    });

    const respuesta = await pedir(new AbortController(), "x");

    expect(respuesta.status).toBe(404);
    expect(await respuesta.json()).toEqual({ error: "SESION_NO_ENCONTRADA" });
  });

  it("cierra por tiempo real aunque las consultas sean lentas", async () => {
    let llamadas = 0;
    conConsulta(async (id) => {
      // la consulta inicial es rápida; las del ciclo tardan
      if (llamadas++ > 0) await new Promise((resolver) => setTimeout(resolver, 400));
      return new InstantaneaDeSesion(id, "EN_CURSO", version, actualizadaEn);
    });
    const lector = lectorDe(await pedir());
    await lector.read();

    await vi.advanceTimersByTimeAsync(292_000);

    expect(await cerrado(lector)).toBe(true);
  });

  it("no escribe en un flujo cerrado si el cliente se va durante la consulta", async () => {
    let llamadas = 0;
    conConsulta(async (id) => {
      // la consulta inicial es rápida; las del ciclo tardan
      if (llamadas++ > 0) await new Promise((resolver) => setTimeout(resolver, 500));
      return new InstantaneaDeSesion(id, "EN_CURSO", version, actualizadaEn);
    });
    const controlador = new AbortController();
    const lector = lectorDe(await pedir(controlador));
    await lector.read();
    await vi.advanceTimersByTimeAsync(1200);
    version = 2;

    controlador.abort();
    await vi.advanceTimersByTimeAsync(2000);

    expect((await lector.read()).done).toBe(true);
  });

  it("envía un comentario ping cada 20 s si nada cambia", async () => {
    const lector = lectorDe(await pedir());
    const decodificador = new TextDecoder();
    await lector.read();

    const siguiente = lector.read();
    await vi.advanceTimersByTimeAsync(20_000);

    expect(decodificador.decode((await siguiente).value)).toBe(": ping\n\n");
    await lector.cancel();
  });
});
