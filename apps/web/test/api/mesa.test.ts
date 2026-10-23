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
import {
  GET as listarPreguntas,
  POST as crearPregunta,
} from "../../src/app/api/mesa/v1/sesiones/[id]/preguntas/route";
import { POST as terminar } from "../../src/app/api/mesa/v1/sesiones/[id]/terminar/route";
import { POST as reprogramar } from "../../src/app/api/mesa/v1/sesiones/[id]/reprogramar/route";
import { POST as cancelar } from "../../src/app/api/mesa/v1/sesiones/[id]/cancelar/route";
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
  creadaPorId: "u1",
  creadaPorDemo: false,
  cuerpoId: "c-general",
  inicio: new Date("2026-11-04T04:30:00.000Z"),
  fin: new Date("2026-11-04T06:30:00.000Z"),
  modalidad: "MIXTA",
  lugar: "Auditorio",
};
const cuerpoGeneral = {
  id: "c-general",
  nombre: "Asamblea general",
  slug: "asamblea-general",
  tipo: "GENERAL",
  archivado: false,
};

const ejecutar = () => ({ ejecutar: vi.fn(async () => undefined) });
const casos = {
  crearSesion: { ejecutar: vi.fn() },
  iniciarSesion: ejecutar(),
  terminarSesion: ejecutar(),
  generarCodigosDeAcceso: { ejecutar: vi.fn() },
  crearPregunta: { ejecutar: vi.fn() },
  listarPreguntasDeSesion: { ejecutar: vi.fn() },
  abrirPregunta: ejecutar(),
  cerrarPregunta: { ejecutar: vi.fn() },
  anularPregunta: ejecutar(),
  proyectarResultado: ejecutar(),
  darLaPalabra: ejecutar(),
  terminarIntervencion: ejecutar(),
  sumarMinuto: ejecutar(),
  rechazarMocion: ejecutar(),
  listarSesionesDeLaMesa: { ejecutar: vi.fn() },
  reprogramarSesion: ejecutar(),
  cancelarSesion: ejecutar(),
};
let hayMesa = true;
let rolActual = "MESA";
let membresiasActuales: { cuerpoId: string; rol: string }[] = [];
const ACTOR = { id: "u1", correo: "m@x.test", nombre: "Mesa", rol: "MESA", membresias: [] };

function conMesa(): void {
  vi.mocked(contenedor).mockReturnValue({
    ...casos,
    membresias: {
      deUsuario: vi.fn(async () => membresiasActuales.map((m) => ({ usuarioId: "u1", ...m }))),
    },
    cuerpos: { listar: vi.fn(async () => [cuerpoGeneral]) },
    institucion: { obtener: vi.fn(async () => ({ zonaHoraria: "America/Bogota" })) },
    autenticacion: () => ({
      api: {
        getSession: vi.fn(async () =>
          hayMesa ? { user: { id: "u1", email: "m@x.test", name: "Mesa", rol: rolActual } } : null,
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
  rolActual = "MESA";
  membresiasActuales = [];
  for (const c of Object.values(casos)) for (const f of Object.values(c)) f.mockClear();
  casos.crearSesion.ejecutar.mockResolvedValue(sesion);
  casos.listarSesionesDeLaMesa.ejecutar.mockResolvedValue([sesion]);
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
      reprogramar(pedir("POST", { titulo: "Otra" }), idp()),
      cancelar(pedir("POST"), idp()),
      iniciar(pedir("POST"), idp()),
      terminar(pedir("POST"), idp()),
      codigos(pedir("POST", { cantidad: 2 }), idp()),
      crearPregunta(pedir("POST", { texto: "¿Sí?" }), idp()),
      listarPreguntas(pedir("GET"), idp()),
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

  it("GET sesiones lista cada una con su cuerpo, horario en hora local y si el actor la gestiona", async () => {
    membresiasActuales = [{ cuerpoId: "c-general", rol: "MESA" }];
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
          cuerpo: { id: "c-general", nombre: "Asamblea general" },
          inicio: "2026-11-04T04:30:00.000Z",
          fin: "2026-11-04T06:30:00.000Z",
          inicioLocal: "2026-11-03T23:30",
          finLocal: "2026-11-04T01:30",
          modalidad: "MIXTA",
          lugar: "Auditorio",
          puedeGestionar: false,
        },
      ],
    });
  });

  it("el actor llega con sus membresías", async () => {
    membresiasActuales = [{ cuerpoId: "c-general", rol: "ENCARGADO" }];
    const r = await listar(pedir("GET"));
    expect((await r.json()).sesiones[0].puedeGestionar).toBe(true);
    expect(casos.listarSesionesDeLaMesa.ejecutar).toHaveBeenLastCalledWith(
      { ...ACTOR, membresias: [{ cuerpoId: "c-general", rol: "ENCARGADO" }] },
      { incluirCuentaDePrueba: false },
    );
  });

  it("POST sesiones crea (201) con cuerpo y horario, y valida el cuerpo (400)", async () => {
    const datos = {
      titulo: "Asamblea",
      modo: "CON_CODIGOS",
      segundosPorIntervencion: 120,
      cuerpoId: "c-general",
      inicio: "2026-11-03T23:30",
      fin: "2026-11-04T01:30",
      modalidad: "MIXTA",
      lugar: "Auditorio",
    };
    const r = await crear(pedir("POST", datos));
    expect(r.status).toBe(201);
    expect((await r.json()).codigoDeSala).toBe("ABCD");
    expect(casos.crearSesion.ejecutar).toHaveBeenCalledWith(ACTOR, {
      titulo: "Asamblea",
      modo: "CON_CODIGOS",
      segundosPorIntervencion: 120,
      cuerpoId: "c-general",
      inicioLocal: "2026-11-03T23:30",
      finLocal: "2026-11-04T01:30",
      modalidad: "MIXTA",
      lugar: "Auditorio",
    });
    expect((await crear(pedir("POST", { titulo: "x", modo: "RARO" }))).status).toBe(400);
    expect((await crear(pedir("POST", { ...datos, cuerpoId: undefined }))).status).toBe(400);
  });

  it("reprogramar pasa las horas locales y cancelar da 204", async () => {
    const r = await reprogramar(
      pedir("POST", { inicio: "2026-11-05T09:00", fin: "2026-11-05T11:00", lugar: null }),
      idp("s9"),
    );
    expect(r.status).toBe(204);
    expect(casos.reprogramarSesion.ejecutar).toHaveBeenCalledWith(ACTOR, "s9", {
      inicioLocal: "2026-11-05T09:00",
      finLocal: "2026-11-05T11:00",
      lugar: null,
    });
    expect((await reprogramar(pedir("POST", {}), idp("s9"))).status).toBe(400);
    expect((await cancelar(pedir("POST"), idp("s9"))).status).toBe(204);
    expect(casos.cancelarSesion.ejecutar).toHaveBeenCalledWith(ACTOR, "s9");
  });

  it("errores nuevos: CUERPO_AJENO 404, HORARIO_INVALIDO 422 con mensaje", async () => {
    casos.crearSesion.ejecutar.mockRejectedValueOnce(new ErrorDeDominio("CUERPO_AJENO"));
    const datos = {
      titulo: "Asamblea",
      modo: "CON_CODIGOS",
      cuerpoId: "c-x",
      inicio: "2026-11-03T14:00",
      fin: "2026-11-03T16:00",
      modalidad: "PRESENCIAL",
    };
    expect((await crear(pedir("POST", datos))).status).toBe(404);
    casos.crearSesion.ejecutar.mockRejectedValueOnce(new ErrorDeDominio("HORARIO_INVALIDO"));
    const r = await crear(pedir("POST", datos));
    expect(r.status).toBe(422);
    expect((await r.json()).mensaje).toMatch(/después del inicio/);
  });

  it("iniciar y terminar dan 204 y pasan el id", async () => {
    expect((await iniciar(pedir("POST"), idp("s9"))).status).toBe(204);
    expect(casos.iniciarSesion.ejecutar).toHaveBeenCalledWith(ACTOR, "s9");
    expect((await terminar(pedir("POST"), idp("s9"))).status).toBe(204);
    expect(casos.terminarSesion.ejecutar).toHaveBeenCalledWith(ACTOR, "s9");
  });

  it("terminar con votación abierta da 409 y el mensaje para la mesa", async () => {
    casos.terminarSesion.ejecutar.mockRejectedValueOnce(
      new ErrorDeDominio("SESION_CON_VOTACION_ABIERTA"),
    );
    const r = await terminar(pedir("POST"), idp());
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({
      error: "SESION_CON_VOTACION_ABIERTA",
      mensaje: "Cierra la votación abierta antes de terminar la sesión.",
    });
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
    expect(casos.generarCodigosDeAcceso.ejecutar).toHaveBeenCalledWith(ACTOR, "s1", 2);
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
    expect(casos.crearPregunta.ejecutar).toHaveBeenCalledWith(ACTOR, "s1", "¿Sí?", [
      "Sí",
      "No",
      "Me abstengo",
    ]);
    expect((await r.json()).id).toBe("p1");
    await crearPregunta(pedir("POST", { texto: "¿Quién?", opciones: ["Ana", "Luis"] }), idp());
    expect(casos.crearPregunta.ejecutar).toHaveBeenLastCalledWith(ACTOR, "s1", "¿Quién?", [
      "Ana",
      "Luis",
    ]);
  });

  it("GET preguntas lista las de la sesión con estado, opciones y resultado de las cerradas", async () => {
    const resultado = {
      totalVotos: 3,
      porOpcion: [{ opcionId: "o1", texto: "Sí", votos: 3, porcentaje: 100 }],
      ganadora: "o1",
      aprobada: true,
    };
    const opciones = [{ id: "o1", texto: "Sí", orden: 0 }];
    casos.listarPreguntasDeSesion.ejecutar.mockResolvedValue([
      {
        pregunta: { id: "p1", texto: "¿Sí?", estado: "CERRADA", resultadoVisible: true, opciones },
        resultado,
      },
      {
        pregunta: { id: "p2", texto: "¿No?", estado: "ANULADA", resultadoVisible: false, opciones },
        resultado: null,
      },
    ]);
    const r = await listarPreguntas(pedir("GET"), idp("s9"));
    expect(r.status).toBe(200);
    expect(r.headers.get("Cache-Control")).toBe("no-store");
    expect(casos.listarPreguntasDeSesion.ejecutar).toHaveBeenCalledWith(ACTOR, "s9");
    expect(await r.json()).toEqual({
      preguntas: [
        {
          id: "p1",
          texto: "¿Sí?",
          estado: "CERRADA",
          resultadoProyectado: true,
          opciones: [{ id: "o1", texto: "Sí" }],
          resultado,
        },
        {
          id: "p2",
          texto: "¿No?",
          estado: "ANULADA",
          resultadoProyectado: false,
          opciones: [{ id: "o1", texto: "Sí" }],
          resultado: null,
        },
      ],
    });
  });

  it("GET preguntas de una sesión inexistente da 404", async () => {
    const { SesionNoEncontrada } = await import("@kuorum/domain");
    casos.listarPreguntasDeSesion.ejecutar.mockRejectedValueOnce(new SesionNoEncontrada("x"));
    expect((await listarPreguntas(pedir("GET"), idp("x"))).status).toBe(404);
  });

  it("abrir, anular y proyectar dan 204; OTRA_PREGUNTA_ABIERTA da 409", async () => {
    expect((await abrir(pedir("POST"), idp("p1"))).status).toBe(204);
    expect(casos.abrirPregunta.ejecutar).toHaveBeenCalledWith(ACTOR, "p1");
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
    expect(casos.darLaPalabra.ejecutar).toHaveBeenLastCalledWith(ACTOR, "s1", null);
    await dar(pedir("POST", { solicitudId: "sol-1" }), idp());
    expect(casos.darLaPalabra.ejecutar).toHaveBeenLastCalledWith(ACTOR, "s1", "sol-1");
    expect((await dar(pedir("POST"), idp())).status).toBe(204);
  });

  it("terminar intervención, sumar minuto y rechazar moción dan 204", async () => {
    expect((await terminarIntervencion(pedir("POST"), idp())).status).toBe(204);
    expect(casos.terminarIntervencion.ejecutar).toHaveBeenCalledWith(ACTOR, "s1");
    expect((await minuto(pedir("POST"), idp())).status).toBe(204);
    expect(casos.sumarMinuto.ejecutar).toHaveBeenCalledWith(ACTOR, "s1");
    const r = await rechazar(pedir("POST"), {
      params: Promise.resolve({ id: "s1", solicitudId: "sol-7" }),
    });
    expect(r.status).toBe(204);
    expect(casos.rechazarMocion.ejecutar).toHaveBeenCalledWith(ACTOR, "s1", "sol-7");
  });

  it("GET sesiones pasa el actor a la lista, que decide qué ve cada rol", async () => {
    rolActual = "DEMO";
    await listar(pedir("GET"));
    expect(casos.listarSesionesDeLaMesa.ejecutar).toHaveBeenCalledWith(
      { ...ACTOR, rol: "DEMO" },
      { incluirCuentaDePrueba: false },
    );
  });

  it("GET sesiones solo pide las de la cuenta de prueba con ?incluirPrueba=1", async () => {
    await listar(pedir("GET"));
    expect(casos.listarSesionesDeLaMesa.ejecutar).toHaveBeenLastCalledWith(ACTOR, {
      incluirCuentaDePrueba: false,
    });
    await listar(new Request("http://localhost/api/mesa/v1/sesiones?incluirPrueba=1"));
    expect(casos.listarSesionesDeLaMesa.ejecutar).toHaveBeenLastCalledWith(ACTOR, {
      incluirCuentaDePrueba: true,
    });
    await listar(new Request("http://localhost/api/mesa/v1/sesiones?incluirPrueba=si"));
    expect(casos.listarSesionesDeLaMesa.ejecutar).toHaveBeenLastCalledWith(ACTOR, {
      incluirCuentaDePrueba: false,
    });
  });

  it("todas las rutas con sesión o pregunta pasan el actor con su rol a los casos de uso", async () => {
    rolActual = "DEMO";
    const demo = { ...ACTOR, rol: "DEMO" };
    await iniciar(pedir("POST"), idp("s1"));
    await terminar(pedir("POST"), idp("s1"));
    await codigos(pedir("POST", { cantidad: 2 }), idp("s1"));
    await crearPregunta(pedir("POST", { texto: "¿Sí?" }), idp("s1"));
    await listarPreguntas(pedir("GET"), idp("s1"));
    await abrir(pedir("POST"), idp("p1"));
    await cerrar(pedir("POST"), idp("p1"));
    await anular(pedir("POST"), idp("p1"));
    await proyectar(pedir("POST"), idp("p1"));
    await dar(pedir("POST", {}), idp("s1"));
    await terminarIntervencion(pedir("POST"), idp("s1"));
    await minuto(pedir("POST"), idp("s1"));
    await rechazar(pedir("POST"), { params: Promise.resolve({ id: "s1", solicitudId: "x" }) });
    await crear(
      pedir("POST", {
        titulo: "Asamblea",
        modo: "SALA_ABIERTA",
        cuerpoId: "c-general",
        inicio: "2026-11-03T14:00",
        fin: "2026-11-03T16:00",
        modalidad: "PRESENCIAL",
      }),
    );
    await reprogramar(pedir("POST", { titulo: "Otra" }), idp("s1"));
    await cancelar(pedir("POST"), idp("s1"));
    for (const caso of [
      casos.reprogramarSesion,
      casos.cancelarSesion,
      casos.iniciarSesion,
      casos.terminarSesion,
      casos.generarCodigosDeAcceso,
      casos.crearPregunta,
      casos.listarPreguntasDeSesion,
      casos.abrirPregunta,
      casos.cerrarPregunta,
      casos.anularPregunta,
      casos.proyectarResultado,
      casos.darLaPalabra,
      casos.terminarIntervencion,
      casos.sumarMinuto,
      casos.rechazarMocion,
      casos.crearSesion,
    ]) {
      expect(caso.ejecutar).toHaveBeenCalledTimes(1);
      expect(caso.ejecutar.mock.calls[0]?.[0]).toEqual(demo);
    }
  });

  it("una sesión ajena a la cuenta de prueba responde igual que una que no existe", async () => {
    rolActual = "DEMO";
    casos.iniciarSesion.ejecutar.mockRejectedValueOnce(new ErrorDeDominio("SESION_AJENA"));
    const ajena = await iniciar(pedir("POST"), idp("de-otro"));
    const { SesionNoEncontrada } = await import("@kuorum/domain");
    casos.iniciarSesion.ejecutar.mockRejectedValueOnce(new SesionNoEncontrada("no-existe"));
    const inexistente = await iniciar(pedir("POST"), idp("no-existe"));

    expect(ajena.status).toBe(404);
    expect(ajena.status).toBe(inexistente.status);
    expect(await ajena.json()).toEqual(await inexistente.json());
    expect(ajena.headers.get("Cache-Control")).toBe("no-store");
  });
});
