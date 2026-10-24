import { ErrorDeDominio } from "@kuorum/domain";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH as editarEnunciado } from "@/app/api/mesa/v1/decisiones/[id]/route";
import { GET as leerActa, PUT as editarActa } from "@/app/api/mesa/v1/sesiones/[id]/acta/route";
import { POST as finalizar } from "@/app/api/mesa/v1/sesiones/[id]/acta/finalizar/route";
import { GET as listarDecisiones } from "@/app/api/mesa/v1/sesiones/[id]/decisiones/route";
import { POST as crear } from "@/app/api/mesa/v1/sesiones/route";
import { POST as reprogramar } from "@/app/api/mesa/v1/sesiones/[id]/reprogramar/route";
import { contenedor } from "@/composicion";

vi.mock("@/composicion", () => ({ contenedor: vi.fn() }));

const casos = {
  obtenerActaDeLaMesa: { ejecutar: vi.fn() },
  editarActa: { ejecutar: vi.fn() },
  finalizarActa: { ejecutar: vi.fn() },
  editarEnunciado: { ejecutar: vi.fn() },
  listarDecisionesDeLaSesion: { ejecutar: vi.fn() },
  crearSesion: { ejecutar: vi.fn() },
  reprogramarSesion: { ejecutar: vi.fn() },
};
let hayMesa = true;
const ACTOR = { id: "u1", correo: "m@x.test", nombre: "Mesa", rol: "MESA", membresias: [] };

const contenido = { titulo: "Asamblea", decisiones: [], ordenDelDia: ["Quórum"] };
const sesion = {
  id: "s1",
  titulo: "Asamblea",
  codigoDeSala: { valor: "ABCD" },
  estado: "PROGRAMADA",
  modo: "CON_CODIGOS",
  creadaEn: new Date("2026-10-20T10:00:00.000Z"),
  creadaPorId: "u1",
  creadaPorDemo: false,
  cuerpoId: "c-general",
  inicio: new Date("2026-11-04T04:30:00.000Z"),
  fin: new Date("2026-11-04T06:30:00.000Z"),
  modalidad: "MIXTA",
  lugar: null,
  ordenDelDia: ["Quórum", "Informe"],
};

beforeEach(() => {
  hayMesa = true;
  for (const c of Object.values(casos)) c.ejecutar.mockReset();
  vi.mocked(contenedor).mockReturnValue({
    ...casos,
    membresias: { deUsuario: vi.fn(async () => []) },
    cuerpos: { listar: vi.fn(async () => [{ id: "c-general", nombre: "Asamblea general" }]) },
    institucion: { obtener: vi.fn(async () => ({ zonaHoraria: "America/Bogota" })) },
    autenticacion: () => ({
      api: {
        getSession: vi.fn(async () =>
          hayMesa ? { user: { id: "u1", email: "m@x.test", name: "Mesa", rol: "MESA" } } : null,
        ),
      },
    }),
  } as unknown as ReturnType<typeof contenedor>);
});

function pedir(metodo: string, cuerpo?: unknown): Request {
  return new Request("http://localhost/api/mesa/v1/x", {
    method: metodo,
    headers: cuerpo === undefined ? {} : { "content-type": "application/json" },
    ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }),
  });
}
const idp = (id = "s1") => ({ params: Promise.resolve({ id }) });

describe("API de la mesa: acta y decisiones", () => {
  it("sin sesión todo da 401 y no toca los casos de uso", async () => {
    hayMesa = false;
    const rs = await Promise.all([
      leerActa(pedir("GET"), idp()),
      editarActa(pedir("PUT", { desarrollo: "x" }), idp()),
      finalizar(pedir("POST"), idp()),
      listarDecisiones(pedir("GET"), idp()),
      editarEnunciado(pedir("PATCH", { enunciado: null }), idp("d1")),
    ]);
    for (const r of rs) expect(r.status).toBe(401);
    for (const c of Object.values(casos)) expect(c.ejecutar).not.toHaveBeenCalled();
  });

  it("GET acta devuelve estado, desarrollo, código y la vista previa", async () => {
    casos.obtenerActaDeLaMesa.ejecutar.mockResolvedValue({
      acta: {
        estado: "FINAL",
        desarrollo: "Texto",
        codigo: { valor: "ABCDE-FGHJK" },
        finalizadaEn: new Date("2026-11-04T07:00:00.000Z"),
      },
      vistaPrevia: contenido,
    });
    const r = await leerActa(pedir("GET"), idp("s7"));
    expect(r.status).toBe(200);
    expect(r.headers.get("Cache-Control")).toBe("no-store");
    expect(await r.json()).toEqual({
      estado: "FINAL",
      desarrollo: "Texto",
      codigo: "ABCDE-FGHJK",
      finalizadaEn: "2026-11-04T07:00:00.000Z",
      vistaPrevia: contenido,
    });
    expect(casos.obtenerActaDeLaMesa.ejecutar).toHaveBeenCalledWith(ACTOR, "s7");
  });

  it("GET acta de un borrador manda código y fecha null", async () => {
    casos.obtenerActaDeLaMesa.ejecutar.mockResolvedValue({
      acta: { estado: "BORRADOR", desarrollo: "", codigo: null, finalizadaEn: null },
      vistaPrevia: contenido,
    });
    const cuerpo = await (await leerActa(pedir("GET"), idp())).json();
    expect(cuerpo).toMatchObject({ estado: "BORRADOR", codigo: null, finalizadaEn: null });
  });

  it("PUT acta da 204, valida el cuerpo (400) y mapea ACTA_FINALIZADA a 409 con mensaje", async () => {
    const ok = await editarActa(pedir("PUT", { desarrollo: "Se abrió" }), idp("s7"));
    expect(ok.status).toBe(204);
    expect(casos.editarActa.ejecutar).toHaveBeenCalledWith(ACTOR, "s7", "Se abrió");
    expect((await editarActa(pedir("PUT", {}), idp())).status).toBe(400);
    expect((await editarActa(pedir("PUT", { desarrollo: "x".repeat(20_001) }), idp())).status).toBe(
      400,
    );

    casos.editarActa.ejecutar.mockRejectedValueOnce(new ErrorDeDominio("ACTA_FINALIZADA"));
    const r = await editarActa(pedir("PUT", { desarrollo: "x" }), idp());
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({
      error: "ACTA_FINALIZADA",
      mensaje: "El acta ya está finalizada y no se puede cambiar.",
    });
  });

  it("POST finalizar devuelve el código; ACTA_NO_ENCONTRADA es 404", async () => {
    casos.finalizarActa.ejecutar.mockResolvedValue({ valor: "ABCDE-FGHJK" });
    const r = await finalizar(pedir("POST"), idp("s7"));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ codigo: "ABCDE-FGHJK" });
    expect(casos.finalizarActa.ejecutar).toHaveBeenCalledWith(ACTOR, "s7");
    casos.finalizarActa.ejecutar.mockRejectedValueOnce(new ErrorDeDominio("ACTA_NO_ENCONTRADA"));
    expect((await finalizar(pedir("POST"), idp())).status).toBe(404);
    casos.finalizarActa.ejecutar.mockRejectedValueOnce(new ErrorDeDominio("ACTA_FINALIZADA"));
    expect((await finalizar(pedir("POST"), idp())).status).toBe(409);
  });

  it("PATCH decisión acepta texto o null, rechaza lo demás y mapea los errores", async () => {
    expect(
      (await editarEnunciado(pedir("PATCH", { enunciado: "Se aprueba." }), idp("d1"))).status,
    ).toBe(204);
    expect(casos.editarEnunciado.ejecutar).toHaveBeenLastCalledWith(ACTOR, "d1", "Se aprueba.");
    await editarEnunciado(pedir("PATCH", { enunciado: null }), idp("d1"));
    expect(casos.editarEnunciado.ejecutar).toHaveBeenLastCalledWith(ACTOR, "d1", null);
    expect((await editarEnunciado(pedir("PATCH", {}), idp("d1"))).status).toBe(400);

    casos.editarEnunciado.ejecutar.mockRejectedValueOnce(
      new ErrorDeDominio("DECISION_NO_ENCONTRADA"),
    );
    expect((await editarEnunciado(pedir("PATCH", { enunciado: "x" }), idp("d1"))).status).toBe(404);
    casos.editarEnunciado.ejecutar.mockRejectedValueOnce(new ErrorDeDominio("ENUNCIADO_INVALIDO"));
    const r = await editarEnunciado(pedir("PATCH", { enunciado: "x" }), idp("d1"));
    expect(r.status).toBe(422);
    expect((await r.json()).mensaje).toBeTruthy();
  });

  it("GET decisiones de la sesión lista lo que la mesa necesita", async () => {
    const resultado = { totalVotos: 2, asistentes: null, porOpcion: [] };
    casos.listarDecisionesDeLaSesion.ejecutar.mockResolvedValue([
      {
        id: "d1",
        preguntaId: "p1",
        sesionId: "s1",
        pregunta: "¿Sí?",
        enunciado: null,
        aprobada: true,
        indicativa: false,
        resultado,
      },
    ]);
    const r = await listarDecisiones(pedir("GET"), idp("s7"));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({
      decisiones: [
        {
          id: "d1",
          preguntaId: "p1",
          pregunta: "¿Sí?",
          enunciado: null,
          aprobada: true,
          indicativa: false,
          resultado,
        },
      ],
    });
    expect(casos.listarDecisionesDeLaSesion.ejecutar).toHaveBeenCalledWith(ACTOR, "s7");
    casos.listarDecisionesDeLaSesion.ejecutar.mockRejectedValueOnce(
      new ErrorDeDominio("SESION_AJENA"),
    );
    expect((await listarDecisiones(pedir("GET"), idp("x"))).status).toBe(404);
  });

  it("crear y reprogramar pasan el orden del día, y la vista de sesión lo devuelve", async () => {
    casos.crearSesion.ejecutar.mockResolvedValue(sesion);
    const datos = {
      titulo: "Asamblea",
      modo: "SALA_ABIERTA",
      cuerpoId: "c-general",
      inicio: "2026-11-03T14:00",
      fin: "2026-11-03T16:00",
      modalidad: "PRESENCIAL",
      ordenDelDia: ["Quórum", "Informe"],
    };
    const r = await crear(pedir("POST", datos));
    expect(r.status).toBe(201);
    expect((await r.json()).ordenDelDia).toEqual(["Quórum", "Informe"]);
    expect(casos.crearSesion.ejecutar.mock.calls[0]?.[1]).toMatchObject({
      ordenDelDia: ["Quórum", "Informe"],
    });
    expect(
      (await crear(pedir("POST", { ...datos, ordenDelDia: Array(31).fill("x") }))).status,
    ).toBe(400);

    await reprogramar(pedir("POST", { ordenDelDia: [] }), idp("s9"));
    expect(casos.reprogramarSesion.ejecutar).toHaveBeenCalledWith(ACTOR, "s9", { ordenDelDia: [] });
  });

  it("los mensajes de los 422 nuevos llegan al cliente", async () => {
    for (const codigo of ["ORDEN_DEL_DIA_INVALIDO", "DESARROLLO_INVALIDO"]) {
      casos.editarActa.ejecutar.mockRejectedValueOnce(new ErrorDeDominio(codigo));
      const r = await editarActa(pedir("PUT", { desarrollo: "x" }), idp());
      expect(r.status).toBe(422);
      expect((await r.json()).mensaje).toBeTruthy();
    }
  });
});
