import { Acta, CodigoDeVerificacion, ErrorDeDominio } from "@kuorum/domain";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as actas } from "../../src/app/api/public/v1/actas/route";
import { GET as pdf } from "../../src/app/api/public/v1/actas/[id]/route";
import { GET as decisiones } from "../../src/app/api/public/v1/decisiones/route";
import { contenedor } from "../../src/composicion";

vi.mock("../../src/composicion", () => ({ contenedor: vi.fn() }));

const DIA = 86_400_000;
const listarDecisiones = vi.fn();
const listarActas = vi.fn();
const obtenerActa = vi.fn();
const cuerposPorId = vi.fn();
const sesionesPorId = vi.fn();

const cuerpo = { id: "c1", slug: "artes", nombre: "Artes" };
const sesion = {
  id: "s1",
  titulo: "Asamblea de Artes",
  cuerpoId: "c1",
  inicio: new Date("2026-11-03T19:00:00Z"),
};
const contenidoDeActa = {
  institucion: "Universidad",
  cuerpo: "Artes",
  titulo: "Asamblea de Artes",
  inicio: "2026-11-03T19:00:00.000Z",
  fin: "2026-11-03T21:00:00.000Z",
  zonaHoraria: "America/Bogota",
  modalidad: "PRESENCIAL",
  lugar: null,
  ordenDelDia: [],
  asistentes: null,
  intervenciones: 0,
  mociones: { ORDEN: 0, PROCEDIMIENTO: 0, ACLARACION: 0, SUFICIENTE_ILUSTRACION: 0 },
  desarrollo: "Se discutió.",
  decisiones: [],
};
const acta = {
  sesionId: "s1",
  codigo: CodigoDeVerificacion.crear("ABCDEFGHJK"),
  finalizadaEn: new Date("2026-11-04T01:00:00Z"),
  contenido: contenidoDeActa,
};
void Acta;

beforeEach(() => {
  for (const m of [listarDecisiones, listarActas, obtenerActa, cuerposPorId, sesionesPorId]) {
    m.mockReset();
  }
  cuerposPorId.mockResolvedValue(cuerpo);
  sesionesPorId.mockResolvedValue(sesion);
  listarDecisiones.mockResolvedValue([
    {
      id: "d1",
      sesionId: "s1",
      cuerpoId: "c1",
      pregunta: "¿Aprueba?",
      enunciado: "Se aprueba.",
      aprobada: true,
      indicativa: false,
      regla: "MAYORIA_SIMPLE",
      resultado: { totalVotos: 3, asistentes: null, porOpcion: [] },
      cerradaEn: new Date("2026-11-03T20:00:00Z"),
      preguntaId: "p1",
      consultaId: null,
    },
  ]);
  listarActas.mockResolvedValue([{ acta, sesion }]);
  obtenerActa.mockResolvedValue({ acta, sesion });
  vi.mocked(contenedor).mockReturnValue({
    listarDecisionesPublicas: { ejecutar: listarDecisiones },
    listarActasPublicas: { ejecutar: listarActas },
    obtenerActaPublica: { ejecutar: obtenerActa },
    cuerpos: { porId: cuerposPorId },
    sesiones: { porId: sesionesPorId },
  } as unknown as ReturnType<typeof contenedor>);
});

const CACHE = "public, max-age=0, s-maxage=60, stale-while-revalidate=300";

describe("GET /api/public/v1/decisiones", () => {
  it("devuelve las decisiones con cuerpo, sesión y caché del borde", async () => {
    const r = await decisiones(
      new Request(
        "http://k.example/api/public/v1/decisiones?desde=2026-11-01T00:00:00Z&hasta=2026-12-01T00:00:00Z&cuerpo=artes",
      ),
    );
    expect(r.status).toBe(200);
    expect(r.headers.get("Cache-Control")).toBe(CACHE);
    expect(await r.json()).toEqual({
      decisiones: [
        {
          id: "d1",
          cuerpo: { slug: "artes", nombre: "Artes" },
          sesion: { id: "s1", titulo: "Asamblea de Artes" },
          pregunta: "¿Aprueba?",
          enunciado: "Se aprueba.",
          aprobada: true,
          indicativa: false,
          regla: "MAYORIA_SIMPLE",
          resultado: { totalVotos: 3, asistentes: null, porOpcion: [] },
          cerradaEn: "2026-11-03T20:00:00.000Z",
        },
      ],
    });
    expect(listarDecisiones).toHaveBeenCalledWith({
      desde: new Date("2026-11-01T00:00:00Z"),
      hasta: new Date("2026-12-01T00:00:00Z"),
      cuerpoSlug: "artes",
    });
  });

  it("sin rango va de 365 días atrás a mañana, dentro del máximo", async () => {
    await decisiones(new Request("http://k.example/api/public/v1/decisiones"));
    const { desde, hasta } = listarDecisiones.mock.calls[0]?.[0] as { desde: Date; hasta: Date };
    expect(Math.round((Date.now() - desde.getTime()) / DIA)).toBe(365);
    expect(Math.round((hasta.getTime() - Date.now()) / DIA)).toBe(1);
  });

  it("fecha ilegible da 400; cuerpo inexistente 404; rango largo 422", async () => {
    expect((await decisiones(new Request("http://k.example/x?desde=ayer"))).status).toBe(400);
    listarDecisiones.mockRejectedValueOnce(new ErrorDeDominio("CUERPO_NO_EXISTE"));
    expect((await decisiones(new Request("http://k.example/x?cuerpo=n"))).status).toBe(404);
    listarDecisiones.mockRejectedValueOnce(new ErrorDeDominio("RANGO_INVALIDO"));
    expect((await decisiones(new Request("http://k.example/x"))).status).toBe(422);
  });
});

describe("GET /api/public/v1/actas", () => {
  it("lista las actas con código y enlace al PDF", async () => {
    const r = await actas(new Request("http://k.example/api/public/v1/actas"));
    expect(r.status).toBe(200);
    expect(r.headers.get("Cache-Control")).toBe(CACHE);
    expect(await r.json()).toEqual({
      actas: [
        {
          id: "s1",
          cuerpo: { slug: "artes", nombre: "Artes" },
          titulo: "Asamblea de Artes",
          inicio: "2026-11-03T19:00:00.000Z",
          finalizadaEn: "2026-11-04T01:00:00.000Z",
          codigo: "ABCDE-FGHJK",
          pdf: "/api/public/v1/actas/s1.pdf",
        },
      ],
    });
  });

  it("cuerpo inexistente da 404", async () => {
    listarActas.mockRejectedValueOnce(new ErrorDeDominio("CUERPO_NO_EXISTE"));
    expect((await actas(new Request("http://k.example/x?cuerpo=n"))).status).toBe(404);
  });
});

const contexto = (id: string) => ({ params: Promise.resolve({ id }) });

describe("GET /api/public/v1/actas/{id}.pdf", () => {
  it("sirve el PDF con su caché de un día y el código en el nombre", async () => {
    const r = await pdf(
      new Request("http://k.example/api/public/v1/actas/s1.pdf"),
      contexto("s1.pdf"),
    );
    expect(r.status).toBe(200);
    expect(obtenerActa).toHaveBeenCalledWith("s1");
    expect(r.headers.get("Content-Type")).toBe("application/pdf");
    expect(r.headers.get("Content-Disposition")).toBe('inline; filename="acta-ABCDE-FGHJK.pdf"');
    expect(r.headers.get("Cache-Control")).toBe("public, max-age=0, s-maxage=86400");
    const bytes = new Uint8Array(await r.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
  });

  it("el id sin .pdf también sirve", async () => {
    const r = await pdf(new Request("http://k.example/x"), contexto("s1"));
    expect(r.status).toBe(200);
    expect(obtenerActa).toHaveBeenCalledWith("s1");
  });

  it("una sesión sin acta pública (no final o de la cuenta de prueba) da 404 cacheado poco", async () => {
    obtenerActa.mockRejectedValueOnce(new ErrorDeDominio("ACTA_NO_ENCONTRADA"));
    const r = await pdf(new Request("http://k.example/x"), contexto("s9.pdf"));
    expect(r.status).toBe(404);
    expect(r.headers.get("Cache-Control")).toBe(CACHE);
    expect(r.headers.get("Content-Type")).not.toBe("application/pdf");
  });
});
