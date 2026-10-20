import { ErrorDeDominio } from "@kuorum/domain";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as estado } from "../../src/app/api/public/v1/salas/[codigo]/estado/route";
import { POST as ingresar } from "../../src/app/api/public/v1/salas/[codigo]/ingresar/route";
import { POST as mociones } from "../../src/app/api/public/v1/salas/[codigo]/mociones/route";
import { POST as palabra } from "../../src/app/api/public/v1/salas/[codigo]/palabra/route";
import { DELETE as retirar } from "../../src/app/api/public/v1/salas/[codigo]/solicitudes/[id]/route";
import { POST as votos } from "../../src/app/api/public/v1/salas/[codigo]/votos/route";
import { contenedor } from "../../src/composicion";
import { limitesPublicos } from "../../src/http/limite-de-tasa";
import { firmar, nombreDeCookie } from "../../src/http/sesion-de-participante";

vi.mock("../../src/composicion", () => ({ contenedor: vi.fn() }));

const CACHE_ESTADO = "public, max-age=0, s-maxage=2, stale-while-revalidate=2";
let ip = 0;

const casos = {
  consultarEstadoDeSala: { ejecutar: vi.fn() },
  ingresarASala: { ejecutar: vi.fn() },
  emitirVoto: { ejecutar: vi.fn() },
  pedirLaPalabra: { ejecutar: vi.fn() },
  presentarMocion: { ejecutar: vi.fn() },
  retirarSolicitud: { ejecutar: vi.fn() },
  sesiones: { porCodigoDeSala: vi.fn() },
};

function estadoDeSala(version = 7, votos = 2) {
  return {
    sala: {
      codigo: "ABCD",
      titulo: "Asamblea",
      estado: "EN_CURSO",
      modo: "SALA_ABIERTA",
      indicativa: true,
    },
    version,
    asistencia: null,
    pregunta: {
      id: "p1",
      texto: "¿Sí?",
      estado: "ABIERTA",
      secreta: true,
      opciones: [],
      votosEmitidos: votos,
      resultado: null,
    },
    palabra: { conLaPalabra: null, fila: [] },
    horaDelServidor: "2026-10-20T12:00:00.000Z",
  };
}

function peticion(
  metodo: string,
  cuerpo?: unknown,
  opciones: { cookie?: string; ip?: string; crudo?: string } = {},
): Request {
  const cabeceras: Record<string, string> = {
    "x-forwarded-for": opciones.ip ?? `10.0.0.${(ip += 1)}`,
  };
  if (opciones.cookie !== undefined) cabeceras["cookie"] = opciones.cookie;
  if (cuerpo !== undefined || opciones.crudo !== undefined)
    cabeceras["content-type"] = "application/json";
  return new Request("http://localhost/api/public/v1/salas/ABCD/x", {
    method: metodo,
    headers: cabeceras,
    ...(opciones.crudo !== undefined
      ? { body: opciones.crudo }
      : cuerpo !== undefined
        ? { body: JSON.stringify(cuerpo) }
        : {}),
  });
}

const sala = (codigo = "ABCD") => ({ params: Promise.resolve({ codigo }) });
const cookieValida = (id = "p1", codigo = "ABCD") =>
  `${nombreDeCookie(codigo)}=${firmar(id, codigo)}`;

beforeEach(() => {
  vi.stubEnv("KUORUM_SECRETO", "secreto-de-prueba-largo-123456");
  for (const caso of Object.values(casos)) for (const f of Object.values(caso)) f.mockReset();
  casos.sesiones.porCodigoDeSala.mockResolvedValue({ id: "s1" });
  vi.mocked(contenedor).mockReturnValue(casos as unknown as ReturnType<typeof contenedor>);
  limitesPublicos.reiniciar();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("GET salas/{codigo}/estado", () => {
  beforeEach(() => {
    casos.consultarEstadoDeSala.ejecutar.mockResolvedValue(estadoDeSala());
  });

  it("200 con cuerpo, ETag y la caché de ADR 0001", async () => {
    const r = await estado(peticion("GET"), sala());
    expect(r.status).toBe(200);
    expect(r.headers.get("ETag")).toBe('W/"7-2"');
    expect(r.headers.get("Cache-Control")).toBe(CACHE_ESTADO);
    expect((await r.json()).version).toBe(7);
    expect(casos.consultarEstadoDeSala.ejecutar).toHaveBeenCalledWith("ABCD");
  });

  it("304 sin cuerpo si If-None-Match coincide, 200 si es vieja", async () => {
    const igual = new Request("http://localhost/x", { headers: { "If-None-Match": 'W/"7-2"' } });
    const r = await estado(igual, sala());
    expect(r.status).toBe(304);
    expect(r.headers.get("ETag")).toBe('W/"7-2"');
    expect(r.headers.get("Cache-Control")).toBe(CACHE_ESTADO);
    expect(await r.text()).toBe("");

    const vieja = new Request("http://localhost/x", { headers: { "If-None-Match": 'W/"7-1"' } });
    expect((await estado(vieja, sala())).status).toBe(200);
  });

  it("404 SALA_NO_DISPONIBLE con caché pública corta", async () => {
    casos.consultarEstadoDeSala.ejecutar.mockRejectedValue(
      new ErrorDeDominio("SALA_NO_DISPONIBLE"),
    );
    const r = await estado(peticion("GET"), sala("ZZZZ"));
    expect(r.status).toBe(404);
    expect(r.headers.get("Cache-Control")).toBe("public, max-age=0, s-maxage=1");
    expect(await r.json()).toMatchObject({ error: "SALA_NO_DISPONIBLE" });
  });

  it("500 si falla algo inesperado", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    casos.consultarEstadoDeSala.ejecutar.mockRejectedValue(new Error("boom"));
    const r = await estado(peticion("GET"), sala());
    expect(r.status).toBe(500);
    expect(r.headers.get("Cache-Control")).toBe("no-store");
  });
});

describe("POST ingresar", () => {
  beforeEach(() => {
    casos.ingresarASala.ejecutar.mockResolvedValue({ participanteId: "p1", sesionId: "s1" });
  });

  it("con código crea la cookie firmada y no expone ids", async () => {
    const r = await ingresar(peticion("POST", { codigo: "ABCD-2345" }), sala());
    expect(r.status).toBe(200);
    expect(r.headers.get("Cache-Control")).toBe("no-store");
    expect(await r.json()).toEqual({ ok: true });
    const cookie = r.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${nombreDeCookie("ABCD")}=${firmar("p1", "ABCD")}`);
    expect(cookie).toMatch(/HttpOnly/);
    expect(casos.ingresarASala.ejecutar).toHaveBeenCalledWith("ABCD", {
      tipo: "CODIGO",
      codigo: "ABCD-2345",
    });
  });

  it("con token del navegador usa la credencial NAVEGADOR", async () => {
    await ingresar(peticion("POST", { tokenNavegador: "t-1" }), sala());
    expect(casos.ingresarASala.ejecutar).toHaveBeenCalledWith("ABCD", {
      tipo: "NAVEGADOR",
      token: "t-1",
    });
  });

  it("el mismo código desde dos requests sin cookie da el mismo participante", async () => {
    const a = await ingresar(peticion("POST", { codigo: "ABCD-2345" }), sala());
    const b = await ingresar(peticion("POST", { codigo: "ABCD-2345" }), sala());
    expect(a.headers.get("set-cookie")).toBe(b.headers.get("set-cookie"));
    expect(casos.ingresarASala.ejecutar).toHaveBeenCalledTimes(2);
    expect(casos.ingresarASala.ejecutar.mock.calls[0]).toEqual(
      casos.ingresarASala.ejecutar.mock.calls[1],
    );
  });

  it("es idempotente: con cookie válida y sin código no vuelve a ingresar", async () => {
    const r = await ingresar(
      peticion("POST", { tokenNavegador: "t-1" }, { cookie: cookieValida() }),
      sala(),
    );
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
    expect(casos.ingresarASala.ejecutar).not.toHaveBeenCalled();
  });

  it("si manda otro código, ingresa aunque haya cookie", async () => {
    await ingresar(peticion("POST", { codigo: "ABCD-2345" }, { cookie: cookieValida() }), sala());
    expect(casos.ingresarASala.ejecutar).toHaveBeenCalledOnce();
  });

  it("400 SOLICITUD_INVALIDA con cuerpo malo o JSON roto", async () => {
    for (const r of [
      await ingresar(peticion("POST", {}), sala()),
      await ingresar(peticion("POST", undefined, { crudo: "{no" }), sala()),
    ]) {
      expect(r.status).toBe(400);
      expect(await r.json()).toEqual({ error: "SOLICITUD_INVALIDA" });
    }
  });

  it("404 si el código de sala de la URL no tiene formato de sala", async () => {
    const r = await ingresar(peticion("POST", { codigo: "ABCD-2345" }), sala("a b"));
    expect(r.status).toBe(404);
    expect(casos.ingresarASala.ejecutar).not.toHaveBeenCalled();
  });

  it("errores del dominio: SALA_NO_DISPONIBLE 404, CODIGO_NO_EXISTE 422 con mensaje", async () => {
    casos.ingresarASala.ejecutar.mockRejectedValueOnce(new ErrorDeDominio("SALA_NO_DISPONIBLE"));
    expect((await ingresar(peticion("POST", { codigo: "ABCD-2345" }), sala())).status).toBe(404);
    casos.ingresarASala.ejecutar.mockRejectedValueOnce(new ErrorDeDominio("CODIGO_NO_EXISTE"));
    const r = await ingresar(peticion("POST", { codigo: "ABCD-2345" }), sala());
    expect(r.status).toBe(422);
    expect((await r.json()).mensaje).toBe("Ese código no es de esta sala.");
  });

  it("sin KUORUM_SECRETO responde 500 y lo registra", async () => {
    vi.stubEnv("KUORUM_SECRETO", "");
    const registro = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const r = await ingresar(peticion("POST", { codigo: "ABCD-2345" }), sala());
    expect(r.status).toBe(500);
    expect(String(registro.mock.calls[0]?.[0])).toMatch(/KUORUM_SECRETO/);
  });

  it("429 al pasar de 60 por minuto desde la misma IP", async () => {
    const mismaIp = { ip: "203.0.113.5" };
    for (let i = 0; i < 60; i += 1) {
      expect(
        (await ingresar(peticion("POST", { codigo: "ABCD-2345" }, mismaIp), sala())).status,
      ).toBe(200);
    }
    const r = await ingresar(peticion("POST", { codigo: "ABCD-2345" }, mismaIp), sala());
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ error: "DEMASIADAS_SOLICITUDES" });
    expect(r.headers.get("Cache-Control")).toBe("no-store");
  });
});

describe("POST votos", () => {
  const cuerpo = { preguntaId: "p1", opcionId: "o1" };

  it("201 { votado: true } con cookie válida", async () => {
    const r = await votos(peticion("POST", cuerpo, { cookie: cookieValida("part-9") }), sala());
    expect(r.status).toBe(201);
    expect(r.headers.get("Cache-Control")).toBe("no-store");
    expect(await r.json()).toEqual({ votado: true });
    expect(casos.emitirVoto.ejecutar).toHaveBeenCalledWith("part-9", "p1", "o1");
  });

  it("401 SIN_INGRESO sin cookie", async () => {
    const r = await votos(peticion("POST", cuerpo), sala());
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ error: "SIN_INGRESO" });
    expect(casos.emitirVoto.ejecutar).not.toHaveBeenCalled();
  });

  it("401 con cookie alterada", async () => {
    const mala = `${nombreDeCookie("ABCD")}=part-9.${"A".repeat(43)}`;
    expect((await votos(peticion("POST", cuerpo, { cookie: mala }), sala())).status).toBe(401);
  });

  it("401 con la cookie de otra sala", async () => {
    const ajena = cookieValida("part-9", "WXYZ");
    expect((await votos(peticion("POST", cuerpo, { cookie: ajena }), sala("ABCD"))).status).toBe(
      401,
    );
    const copiada = `${nombreDeCookie("ABCD")}=${firmar("part-9", "WXYZ")}`;
    expect((await votos(peticion("POST", cuerpo, { cookie: copiada }), sala("ABCD"))).status).toBe(
      401,
    );
  });

  it.each([
    ["YA_VOTO", 409],
    ["PREGUNTA_CERRADA", 409],
    ["OPCION_INVALIDA", 422],
    ["PARTICIPANTE_AJENO", 403],
    ["PREGUNTA_NO_ENCONTRADA", 404],
  ])("%s da %i", async (codigo, estadoHttp) => {
    casos.emitirVoto.ejecutar.mockRejectedValue(new ErrorDeDominio(codigo));
    const r = await votos(peticion("POST", cuerpo, { cookie: cookieValida() }), sala());
    expect(r.status).toBe(estadoHttp);
    expect((await r.json()).error).toBe(codigo);
  });

  it("400 con cuerpo inválido", async () => {
    const r = await votos(
      peticion("POST", { preguntaId: "p1" }, { cookie: cookieValida() }),
      sala(),
    );
    expect(r.status).toBe(400);
  });

  it("429 después de 60 por minuto desde la misma IP", async () => {
    const o = { cookie: cookieValida(), ip: "203.0.113.6" };
    for (let i = 0; i < 60; i += 1) await votos(peticion("POST", cuerpo, o), sala());
    expect((await votos(peticion("POST", cuerpo, o), sala())).status).toBe(429);
  });
});

describe("palabra, mociones y solicitudes", () => {
  it("POST palabra devuelve 201 { solicitudId }", async () => {
    casos.pedirLaPalabra.ejecutar.mockResolvedValue("sol-1");
    const r = await palabra(
      peticion("POST", { nombreVisible: "Ana" }, { cookie: cookieValida() }),
      sala(),
    );
    expect(r.status).toBe(201);
    expect(r.headers.get("Cache-Control")).toBe("no-store");
    expect(await r.json()).toEqual({ solicitudId: "sol-1" });
    expect(casos.pedirLaPalabra.ejecutar).toHaveBeenCalledWith("p1", "s1", "Ana");
  });

  it("POST mociones devuelve 201 { solicitudId }", async () => {
    casos.presentarMocion.ejecutar.mockResolvedValue("sol-2");
    const r = await mociones(
      peticion("POST", { nombreVisible: "Ana", tipo: "ORDEN" }, { cookie: cookieValida() }),
      sala(),
    );
    expect(r.status).toBe(201);
    expect(await r.json()).toEqual({ solicitudId: "sol-2" });
    expect(casos.presentarMocion.ejecutar).toHaveBeenCalledWith("p1", "s1", "Ana", "ORDEN");
  });

  it("mociones: 400 con tipo desconocido", async () => {
    const r = await mociones(
      peticion("POST", { nombreVisible: "Ana", tipo: "X" }, { cookie: cookieValida() }),
      sala(),
    );
    expect(r.status).toBe(400);
  });

  it("palabra: YA_EN_LA_FILA 409 y SESION_NO_EN_CURSO 409", async () => {
    casos.pedirLaPalabra.ejecutar.mockRejectedValueOnce(new ErrorDeDominio("YA_EN_LA_FILA"));
    expect(
      (await palabra(peticion("POST", { nombreVisible: "A" }, { cookie: cookieValida() }), sala()))
        .status,
    ).toBe(409);
    casos.pedirLaPalabra.ejecutar.mockRejectedValueOnce(new ErrorDeDominio("SESION_NO_EN_CURSO"));
    expect(
      (await palabra(peticion("POST", { nombreVisible: "A" }, { cookie: cookieValida() }), sala()))
        .status,
    ).toBe(409);
  });

  it("palabra y mociones: 401 sin cookie; 404 si la sala no existe", async () => {
    expect((await palabra(peticion("POST", { nombreVisible: "A" }), sala())).status).toBe(401);
    casos.sesiones.porCodigoDeSala.mockResolvedValue(null);
    const r = await palabra(
      peticion("POST", { nombreVisible: "A" }, { cookie: cookieValida() }),
      sala(),
    );
    expect(r.status).toBe(404);
    expect(await r.json()).toMatchObject({ error: "SALA_NO_DISPONIBLE" });
  });

  it("DELETE solicitudes/{id} da 204 y retira la solicitud del participante", async () => {
    const r = await retirar(peticion("DELETE", undefined, { cookie: cookieValida() }), {
      params: Promise.resolve({ codigo: "ABCD", id: "sol-1" }),
    });
    expect(r.status).toBe(204);
    expect(r.headers.get("Cache-Control")).toBe("no-store");
    expect(casos.retirarSolicitud.ejecutar).toHaveBeenCalledWith("p1", "sol-1");
  });

  it("DELETE: NO_ES_TUYA 403 y sin cookie 401", async () => {
    const params = { params: Promise.resolve({ codigo: "ABCD", id: "sol-1" }) };
    casos.retirarSolicitud.ejecutar.mockRejectedValue(new ErrorDeDominio("NO_ES_TUYA"));
    expect(
      (await retirar(peticion("DELETE", undefined, { cookie: cookieValida() }), params)).status,
    ).toBe(403);
    expect((await retirar(peticion("DELETE"), params)).status).toBe(401);
  });
});
