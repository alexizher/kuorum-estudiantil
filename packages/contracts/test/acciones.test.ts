import { describe, expect, it } from "vitest";
import {
  esquemaCambioDeCuerpo,
  esquemaCuerpo,
  esquemaInstitucion,
  esquemaMembresia,
  esquemaPersona,
  esquemaReprogramar,
  esquemaCrearPregunta,
  esquemaCrearSesion,
  esquemaDarLaPalabra,
  esquemaGenerarCodigos,
  esquemaIngresar,
  esquemaMocion,
  esquemaVoto,
} from "../src/index.js";

describe("esquemas de acciones", () => {
  it("ingresar pide código o token del navegador", () => {
    expect(esquemaIngresar.safeParse({ codigo: "ABCD-2345" }).success).toBe(true);
    expect(esquemaIngresar.safeParse({ tokenNavegador: "t" }).success).toBe(true);
    expect(esquemaIngresar.safeParse({}).success).toBe(false);
    expect(esquemaIngresar.safeParse({ codigo: 5 }).success).toBe(false);
  });

  it("voto exige los dos ids como texto", () => {
    expect(esquemaVoto.safeParse({ preguntaId: "p", opcionId: "o" }).success).toBe(true);
    expect(esquemaVoto.safeParse({ preguntaId: "p" }).success).toBe(false);
    expect(esquemaVoto.safeParse({ preguntaId: "", opcionId: "o" }).success).toBe(false);
  });

  it("moción solo acepta los tipos del dominio", () => {
    expect(esquemaMocion.safeParse({ nombreVisible: "Ana", tipo: "ORDEN" }).success).toBe(true);
    expect(esquemaMocion.safeParse({ nombreVisible: "Ana", tipo: "OTRA" }).success).toBe(false);
  });

  it("códigos pide una cantidad entera", () => {
    expect(esquemaGenerarCodigos.safeParse({ cantidad: 10 }).success).toBe(true);
    expect(esquemaGenerarCodigos.safeParse({ cantidad: 1.5 }).success).toBe(false);
    expect(esquemaGenerarCodigos.safeParse({ cantidad: "10" }).success).toBe(false);
    expect(esquemaGenerarCodigos.safeParse({ cantidad: 0 }).success).toBe(false);
    expect(esquemaGenerarCodigos.safeParse({ cantidad: 2001 }).success).toBe(false);
    expect(esquemaGenerarCodigos.safeParse({ cantidad: 2000 }).success).toBe(true);
  });

  it("segundos por intervención entre 30 y 900", () => {
    const base = {
      titulo: "Asamblea",
      modo: "SALA_ABIERTA" as const,
      cuerpoId: "c1",
      inicio: "2026-11-03T14:00",
      fin: "2026-11-03T16:00",
      modalidad: "PRESENCIAL" as const,
    };
    expect(esquemaCrearSesion.safeParse({ ...base, segundosPorIntervencion: 29 }).success).toBe(
      false,
    );
    expect(esquemaCrearSesion.safeParse({ ...base, segundosPorIntervencion: 901 }).success).toBe(
      false,
    );
    expect(esquemaCrearSesion.safeParse({ ...base, segundosPorIntervencion: 180 }).success).toBe(
      true,
    );
  });

  it("pregunta: opciones es opcional; dar la palabra sin solicitud vale", () => {
    expect(esquemaCrearPregunta.safeParse({ texto: "¿Aprobamos?" }).success).toBe(true);
    expect(esquemaCrearPregunta.safeParse({ texto: "x", opciones: [1] }).success).toBe(false);
    expect(esquemaDarLaPalabra.safeParse({}).success).toBe(true);
  });

  describe("programación de sesiones", () => {
    const base = {
      titulo: "Asamblea",
      modo: "SALA_ABIERTA",
      cuerpoId: "c1",
      inicio: "2026-11-03T14:00",
      fin: "2026-11-03T16:00",
      modalidad: "MIXTA",
    };

    it("crear exige cuerpo, inicio, fin y modalidad; lugar es opcional", () => {
      expect(esquemaCrearSesion.safeParse(base).success).toBe(true);
      expect(esquemaCrearSesion.safeParse({ ...base, lugar: "Auditorio" }).success).toBe(true);
      expect(esquemaCrearSesion.safeParse({ ...base, lugar: null }).success).toBe(true);
      for (const falta of ["cuerpoId", "inicio", "fin", "modalidad"]) {
        const sin = Object.fromEntries(Object.entries(base).filter(([clave]) => clave !== falta));
        expect(esquemaCrearSesion.safeParse(sin).success).toBe(false);
      }
    });

    it("las horas van como hora local sin desfase", () => {
      for (const inicio of ["2026-11-03T14:00:00", "2026-11-03T14:00Z", "3/11/2026 14:00", ""]) {
        expect(esquemaCrearSesion.safeParse({ ...base, inicio }).success).toBe(false);
      }
      expect(esquemaCrearSesion.safeParse({ ...base, modalidad: "HIBRIDA" }).success).toBe(false);
      expect(esquemaCrearSesion.safeParse({ ...base, lugar: "x".repeat(201) }).success).toBe(false);
    });

    it("reprogramar acepta cualquier subconjunto, pero no vacío", () => {
      expect(esquemaReprogramar.safeParse({ titulo: "Otra" }).success).toBe(true);
      expect(esquemaReprogramar.safeParse({ inicio: "2026-11-03T14:00" }).success).toBe(true);
      expect(esquemaReprogramar.safeParse({ lugar: null }).success).toBe(true);
      expect(esquemaReprogramar.safeParse({}).success).toBe(false);
      expect(esquemaReprogramar.safeParse({ inicio: "mañana" }).success).toBe(false);
    });
  });

  describe("administración", () => {
    it("institución con campos opcionales, al menos uno", () => {
      expect(esquemaInstitucion.safeParse({ nombre: "U" }).success).toBe(true);
      expect(esquemaInstitucion.safeParse({ zonaHoraria: "America/Lima" }).success).toBe(true);
      expect(esquemaInstitucion.safeParse({}).success).toBe(false);
      expect(esquemaInstitucion.safeParse({ nombre: 3 }).success).toBe(false);
    });

    it("cuerpo nuevo con nombre; cambio de cuerpo es renombrar o archivar", () => {
      expect(esquemaCuerpo.safeParse({ nombre: "Artes" }).success).toBe(true);
      expect(esquemaCuerpo.safeParse({}).success).toBe(false);
      expect(esquemaCambioDeCuerpo.safeParse({ nombre: "Artes" }).success).toBe(true);
      expect(esquemaCambioDeCuerpo.safeParse({ archivado: true }).success).toBe(true);
      expect(esquemaCambioDeCuerpo.safeParse({ archivado: false }).success).toBe(false);
      expect(esquemaCambioDeCuerpo.safeParse({}).success).toBe(false);
    });

    it("persona con correo válido; membresía con rol del dominio", () => {
      expect(esquemaPersona.safeParse({ correo: "a@b.co", nombre: "Ana" }).success).toBe(true);
      expect(esquemaPersona.safeParse({ correo: "ana", nombre: "Ana" }).success).toBe(false);
      expect(esquemaMembresia.safeParse({ cuerpoId: "c1", rol: "ENCARGADO" }).success).toBe(true);
      expect(esquemaMembresia.safeParse({ cuerpoId: "c1", rol: "MESA" }).success).toBe(true);
      expect(esquemaMembresia.safeParse({ cuerpoId: "c1", rol: "SUPERADMIN" }).success).toBe(false);
    });
  });
});
