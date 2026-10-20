import { ErrorDeDominio } from "@kuorum/domain";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as anular } from "../../src/app/api/mesa/v1/preguntas/[id]/anular/route";
import { POST as abrir } from "../../src/app/api/mesa/v1/preguntas/[id]/abrir/route";
import { POST as cerrar } from "../../src/app/api/mesa/v1/preguntas/[id]/cerrar/route";
import { POST as proyectar } from "../../src/app/api/mesa/v1/preguntas/[id]/proyectar/route";
import { GET as listar, POST as crear } from "../../src/app/api/mesa/v1/sesiones/route";
import { POST as codigos } from "../../src/app/api/mesa/v1/sesiones/[id]/codigos/route";
import { POST as iniciar } from "../../src/app/api/mesa/v1/sesiones/[id]/iniciar/route";
import { POST as rechazar } from "../../src/app/api/mesa/v1/sesiones/[id]/mociones/[solicitudId]/rechazar/route";
import { POST as minuto } from "../../src/app/api/mesa/v1/sesiones/[id]/palabra/minuto/route";
import { POST as dar } from "../../src/app/api/mesa/v1/sesiones/[id]/palabra/dar/route";
import { POST as terminarIntervencion } from "../../src/app/api/mesa/v1/sesiones/[id]/palabra/terminar/route";
import { POST as crearPregunta } from "../../src/app/api/mesa/v1/sesiones/[id]/preguntas/route";
import { POST as terminar } from "../../src/app/api/mesa/v1/sesiones/[id]/terminar/route";
import { contenedor } from "../../src/composicion";

vi.mock("../../src/composicion", () => ({ contenedor: vi.fn() }));

const creada = new Date("2026-10-20T10:00:00.000Z");
const sesion = {
  id: "s1",
  titulo: "Asamblea",
  codigoDeSala: { valor: "ABCD" },
  estado: "PROGRAMADA",
  modo: "CON_CODIGOS",
  creadaEn: creada,
};

const ejecutar = () => ({ ejecutar: vi.fn(async () => undefined) });
const casos = {
  crearSesion: { ejecutar: vi.fn() },
  iniciarSesion: ejecutar(),
  terminarSesion: ejecutar(),
  generarCodigosDeAcceso: { ejecutar: vi.fn() },
  crearPregunta: { ejecutar: vi.fn() },
  abrirPregunta: ejecutar(),
  cerrarPregunta: { ejecutar: vi.fn() },
  anularPregunta: ejecutar(),
  proyectarResultado: ejecutar(),
  darLaPalabra: ejecutar(),
  terminarIntervencion: ejecutar(),
  sumarMinuto: ejecutar(),
  rechazarMocion: ejecutar(),
  sesiones: { listar: vi.fn() },
};
let hayMesa = true;

function conMesa(): void {
  vi.mocked(contenedor).mockReturnValue({
    ...casos,
    autenticacion: () => ({
      api: {
        getSession: vi.fn(async () =>
          hayMesa ? { user: { id: "u1", email: "m@x.test", name: "Mesa" } } : null,
        ),
      },
    }),
  } as unknown as ReturnType<typeof contenedor>);
}

function pedir(metodo: string, cuerpo?: unknown): Request {
  return new Request("http://localhost/api/mesa/v1/x", {
    method: metodo,
    headers: cuerpo === undefined ? {} : { "content-type": "application/json" },
    ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }),
  });
}
const idp = (id = "s1") => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  hayMesa = true;
  for (const c of Object.values(casos)) for (const f of Object.values(c)) f.mockClear();
  casos.crearSesion.ejecutar.mockResolvedValue(sesion);
  casos.sesiones.listar.mockResolvedValue([sesion]);
  casos.generarCodigosDeAcceso.ejecutar.mockResolvedValue(["AAAA-2222", "BBBB-3333"]);
  casos.crearPregunta.ejecutar.mockResolvedValue({
    id: "p1",
    texto: "¿Sí?",
    estado: "BORRADOR",
    opciones: [{ id: "o1", texto: "Sí", orden: 0 }],
  });
  casos.cerrarPregunta.ejecutar.mockResolvedValue({
    totalVotos: 3,
    porOpcion: [],
    ganadora: null,
    aprobada: null,
  });
  conMesa();
});

describe("API de la mesa", () => {
  it("todas las rutas dan 401 NO_AUTENTICADO sin sesión y no tocan los casos de uso", async () => {
    hayMesa = false;
    const respuestas = await Promise.all([
      listar(pedir("GET")),
      crear(pedir("POST", { titulo: "Asamblea", modo: "SALA_ABIERTA" })),
      iniciar(pedir("POST"), idp()),
      terminar(pedir("POST"), idp()),
      codigos(pedir("POST", { cantidad: 2 }), idp()),
      crearPregunta(pedir("POST", { texto: "¿Sí?" }), idp()),
      abrir(pedir("POST"), idp()),
      cerrar(pedir("POST"), idp()),
      anular(pedir("POST"), idp()),
      proyectar(pedir("POST"), idp()),
      dar(pedir("POST", {}), idp()),
      terminarIntervencion(pedir("POST"), idp()),
      minuto(pedir("POST"), idp()),
      rechazar(pedir("POST"), { params: Promise.resolve({ id: "s1", solicitudId: "x" }) }),
    ]);
    for (const r of respuestas) {
      expect(r.status).toBe(401);
      expect(r.headers.get("Cache-Control")).toBe("no-store");
    }
    expect(casos.crearSesion.ejecutar).not.toHaveBeenCalled();
    expect(casos.iniciarSesion.ejecutar).not.toHaveBeenCalled();
  });

  it("GET sesiones lista id, título, código de sala, estado, modo y creadaEn", async () => {
    const r = await listar(pedir("GET"));
    expect(r.status).toBe(200);
    expect(r.headers.get("Cache-Control")).toBe("no-store");
    expect(await r.json()).toEqual({
      sesiones: [
        {
          id: "s1",
          titulo: "Asamblea",
          codigoDeSala: "ABCD",
          estado: "PROGRAMADA",
          modo: "CON_CODIGOS",
          creadaEn: creada.toISOString(),
        },
      ],
    });
  });

  it("POST sesiones crea (201) y valida el cuerpo (400)", async () => {
    const r = await crear(
      pedir("POST", { titulo: "Asamblea", modo: "CON_CODIGOS", segundosPorIntervencion: 120 }),
    );
    expect(r.status).toBe(201);
    expect((await r.json()).codigoDeSala).toBe("ABCD");
    expect(casos.crearSesion.ejecutar).toHaveBeenCalledWith("Asamblea", "CON_CODIGOS", 120);
    expect((await crear(pedir("POST", { titulo: "x", modo: "RARO" }))).status).toBe(400);
  });

  it("iniciar y terminar dan 204 y pasan el id", async () => {
    expect((await iniciar(pedir("POST"), idp("s9"))).status).toBe(204);
    expect(casos.iniciarSesion.ejecutar).toHaveBeenCalledWith("s9");
    expect((await terminar(pedir("POST"), idp("s9"))).status).toBe(204);
    expect(casos.terminarSesion.ejecutar).toHaveBeenCalledWith("s9");
  });

  it("TRANSICION_INVALIDA al iniciar da 409", async () => {
    casos.iniciarSesion.ejecutar.mockRejectedValueOnce(new ErrorDeDominio("TRANSICION_INVALIDA"));
    expect((await iniciar(pedir("POST"), idp())).status).toBe(409);
  });

  it("codigos devuelve el texto plano una vez, sin caché", async () => {
    const r = await codigos(pedir("POST", { cantidad: 2 }), idp());
    expect(r.status).toBe(200);
    expect(r.headers.get("Cache-Control")).toBe("no-store");
    expect(await r.json()).toEqual({ codigos: ["AAAA-2222", "BBBB-3333"] });
    expect(casos.generarCodigosDeAcceso.ejecutar).toHaveBeenCalledWith("s1", 2);
    expect((await codigos(pedir("POST", { cantidad: "2" }), idp())).status).toBe(400);
  });

  it("sesión inexistente da 404 SESION_NO_ENCONTRADA", async () => {
    const { SesionNoEncontrada } = await import("@kuorum/domain");
    casos.terminarSesion.ejecutar.mockRejectedValueOnce(new SesionNoEncontrada("x"));
    const r = await terminar(pedir("POST"), idp("x"));
    expect(r.status).toBe(404);
    expect(r.headers.get("Cache-Control")).toBe("no-store");
  });

  it("crear pregunta usa Sí/No/Me abstengo si no se mandan opciones", async () => {
    const r = await crearPregunta(pedir("POST", { texto: "¿Sí?" }), idp());
    expect(r.status).toBe(201);
    expect(casos.crearPregunta.ejecutar).toHaveBeenCalledWith("s1", "¿Sí?", [
      "Sí",
      "No",
      "Me abstengo",
    ]);
    expect((await r.json()).id).toBe("p1");
    await crearPregunta(pedir("POST", { texto: "¿Quién?", opciones: ["Ana", "Luis"] }), idp());
    expect(casos.crearPregunta.ejecutar).toHaveBeenLastCalledWith("s1", "¿Quién?", ["Ana", "Luis"]);
  });

  it("abrir, anular y proyectar dan 204; OTRA_PREGUNTA_ABIERTA da 409", async () => {
    expect((await abrir(pedir("POST"), idp("p1"))).status).toBe(204);
    expect(casos.abrirPregunta.ejecutar).toHaveBeenCalledWith("p1");
    expect((await anular(pedir("POST"), idp("p1"))).status).toBe(204);
    expect((await proyectar(pedir("POST"), idp("p1"))).status).toBe(204);
    casos.abrirPregunta.ejecutar.mockRejectedValueOnce(new ErrorDeDominio("OTRA_PREGUNTA_ABIERTA"));
    expect((await abrir(pedir("POST"), idp("p1"))).status).toBe(409);
  });

  it("cerrar devuelve el resultado; CIERRE_OCUPADO da 409 con mensaje", async () => {
    const r = await cerrar(pedir("POST"), idp("p1"));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({
      totalVotos: 3,
      porOpcion: [],
      ganadora: null,
      aprobada: null,
    });
    casos.cerrarPregunta.ejecutar.mockRejectedValueOnce(
      new ErrorDeDominio("CIERRE_OCUPADO", "Hay votos entrando"),
    );
    const ocupado = await cerrar(pedir("POST"), idp("p1"));
    expect(ocupado.status).toBe(409);
    expect(await ocupado.json()).toEqual({
      error: "CIERRE_OCUPADO",
      mensaje: "Hay votos entrando",
    });
  });

  it("dar la palabra acepta solicitudId opcional (null = siguiente)", async () => {
    expect((await dar(pedir("POST", {}), idp())).status).toBe(204);
    expect(casos.darLaPalabra.ejecutar).toHaveBeenLastCalledWith("s1", null);
    await dar(pedir("POST", { solicitudId: "sol-1" }), idp());
    expect(casos.darLaPalabra.ejecutar).toHaveBeenLastCalledWith("s1", "sol-1");
    expect((await dar(pedir("POST"), idp())).status).toBe(204);
  });

  it("terminar intervención, sumar minuto y rechazar moción dan 204", async () => {
    expect((await terminarIntervencion(pedir("POST"), idp())).status).toBe(204);
    expect(casos.terminarIntervencion.ejecutar).toHaveBeenCalledWith("s1");
    expect((await minuto(pedir("POST"), idp())).status).toBe(204);
    expect(casos.sumarMinuto.ejecutar).toHaveBeenCalledWith("s1");
    const r = await rechazar(pedir("POST"), {
      params: Promise.resolve({ id: "s1", solicitudId: "sol-7" }),
    });
    expect(r.status).toBe(204);
    expect(casos.rechazarMocion.ejecutar).toHaveBeenCalledWith("s1", "sol-7");
  });
});
