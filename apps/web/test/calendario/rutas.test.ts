import { ErrorDeDominio } from "@kuorum/domain";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as calendario } from "../../src/app/api/public/v1/calendario/route";
import { GET as ics } from "../../src/app/api/public/v1/calendario.ics/route";
import { contenedor } from "../../src/composicion";

vi.mock("../../src/composicion", () => ({ contenedor: vi.fn() }));

const ejecutar = vi.fn();
const artes = { id: "c-a", nombre: "Artes", slug: "artes", tipo: "FACULTAD", archivado: false };
const vieja = { id: "c-v", nombre: "Vieja", slug: "vieja", tipo: "FACULTAD", archivado: true };
const sesion = {
  id: "s1",
  titulo: "Asamblea de Artes",
  cuerpo: { id: "c-a", nombre: "Artes", slug: "artes" },
  inicio: new Date("2026-11-04T04:30:00Z"),
  fin: new Date("2026-11-04T06:30:00Z"),
  modalidad: "MIXTA",
  lugar: "Auditorio",
  estado: "CANCELADA",
};

beforeEach(() => {
  ejecutar.mockReset();
  ejecutar.mockResolvedValue({
    institucion: {
      nombre: "Universidad",
      tipoDeCuerpoSingular: "Facultad",
      tipoDeCuerpoPlural: "Facultades",
      zonaHoraria: "America/Bogota",
    },
    cuerpos: [artes, vieja],
    sesiones: [sesion, { ...sesion, id: "s2", estado: "PROGRAMADA", lugar: null }],
  });
  vi.mocked(contenedor).mockReturnValue({
    listarCalendario: { ejecutar },
  } as unknown as ReturnType<typeof contenedor>);
});

const DIA = 86_400_000;

describe("GET /api/public/v1/calendario", () => {
  it("devuelve institución, cuerpos y sesiones en ISO, con caché del borde", async () => {
    const r = await calendario(
      new Request(
        "http://kuorum.example/api/public/v1/calendario?desde=2026-11-01T00:00:00Z&hasta=2026-12-01T00:00:00Z&cuerpo=artes",
      ),
    );
    expect(r.status).toBe(200);
    expect(r.headers.get("Cache-Control")).toBe(
      "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
    );
    const cuerpo = await r.json();
    expect(cuerpo.institucion).toEqual({
      nombre: "Universidad",
      tipoDeCuerpoSingular: "Facultad",
      tipoDeCuerpoPlural: "Facultades",
      zonaHoraria: "America/Bogota",
    });
    expect(cuerpo.cuerpos).toEqual([
      { slug: "artes", nombre: "Artes", tipo: "FACULTAD", archivado: false },
      { slug: "vieja", nombre: "Vieja", tipo: "FACULTAD", archivado: true },
    ]);
    expect(cuerpo.sesiones[0]).toEqual({
      id: "s1",
      titulo: "Asamblea de Artes",
      cuerpo: { slug: "artes", nombre: "Artes" },
      inicio: "2026-11-04T04:30:00.000Z",
      fin: "2026-11-04T06:30:00.000Z",
      modalidad: "MIXTA",
      lugar: "Auditorio",
      estado: "CANCELADA",
    });
    expect(ejecutar).toHaveBeenCalledWith({
      desde: new Date("2026-11-01T00:00:00Z"),
      hasta: new Date("2026-12-01T00:00:00Z"),
      cuerpoSlug: "artes",
    });
  });

  it("sin rango va de 30 días atrás a 180 adelante", async () => {
    await calendario(new Request("http://kuorum.example/api/public/v1/calendario"));
    const { desde, hasta } = ejecutar.mock.calls[0]?.[0] as { desde: Date; hasta: Date };
    expect(Math.round((Date.now() - desde.getTime()) / DIA)).toBe(30);
    expect(Math.round((hasta.getTime() - Date.now()) / DIA)).toBe(180);
  });

  it("una fecha que no se entiende da 400", async () => {
    const r = await calendario(
      new Request("http://kuorum.example/api/public/v1/calendario?desde=ayer"),
    );
    expect(r.status).toBe(400);
  });

  it("cuerpo inexistente da 404 y rango largo da 422", async () => {
    ejecutar.mockRejectedValueOnce(new ErrorDeDominio("CUERPO_NO_EXISTE"));
    expect((await calendario(new Request("http://kuorum.example/x?cuerpo=nada"))).status).toBe(404);
    ejecutar.mockRejectedValueOnce(new ErrorDeDominio("RANGO_INVALIDO"));
    expect((await calendario(new Request("http://kuorum.example/x"))).status).toBe(422);
  });
});

describe("GET /api/public/v1/calendario.ics", () => {
  it("responde text/calendar con un evento por sesión, de 90 días atrás a 365 adelante", async () => {
    const r = await ics(
      new Request("http://kuorum.example/api/public/v1/calendario.ics?cuerpo=artes"),
    );
    expect(r.status).toBe(200);
    expect(r.headers.get("Content-Type")).toBe("text/calendar; charset=utf-8");
    expect(r.headers.get("Content-Disposition")).toBe('inline; filename="calendario.ics"');
    expect(r.headers.get("Cache-Control")).toBe(
      "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
    );
    const texto = await r.text();
    expect(texto.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(texto).toContain("UID:s1@kuorum.example");
    expect(texto).toContain("X-WR-CALNAME:Universidad: Artes");
    const { desde, hasta, cuerpoSlug } = ejecutar.mock.calls[0]?.[0] as {
      desde: Date;
      hasta: Date;
      cuerpoSlug: string;
    };
    expect(cuerpoSlug).toBe("artes");
    expect(Math.round((Date.now() - desde.getTime()) / DIA)).toBe(90);
    expect(Math.round((hasta.getTime() - Date.now()) / DIA)).toBe(365);
  });

  it("cuerpo inexistente da 404", async () => {
    ejecutar.mockRejectedValueOnce(new ErrorDeDominio("CUERPO_NO_EXISTE"));
    expect((await ics(new Request("http://kuorum.example/x.ics?cuerpo=nada"))).status).toBe(404);
  });
});
