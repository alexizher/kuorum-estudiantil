import { describe, expect, it } from "vitest";
import {
  CrearSesion,
  LIMITE_DE_SESIONES_ACTIVAS_DE_DEMO,
  MAXIMO_DE_SESIONES_DE_DEMO,
} from "../../src/index.js";
import type { Actor, DatosParaCrearSesion } from "../../src/index.js";
import { crearEscenario, sembrarSesion } from "../dobles/escenario.js";
import {
  CUERPO_ARCHIVADO,
  CUERPO_GENERAL,
  CUERPO_INGENIERIA,
  CUERPO_MEDICINA,
  demo,
  encargadoDeArchivado,
  encargadoDeIngenieria,
  mesa,
  mesaDeIngenieria,
  otraDemo,
  superadmin,
} from "../dobles/actores.js";

function casoDeUso(e: ReturnType<typeof crearEscenario>) {
  const caso = new CrearSesion(
    e.sesiones,
    e.cuerpos,
    e.institucion,
    e.unidad,
    e.ids,
    e.reloj,
    e.codigos,
  );
  // Atajo con la firma vieja: el horario y el cuerpo no importan en la mayoría de las pruebas.
  return {
    ejecutar: (
      actor: Actor,
      titulo: string,
      modo: DatosParaCrearSesion["modo"],
      segundosPorIntervencion?: number,
      extra: Partial<DatosParaCrearSesion> = {},
    ) =>
      caso.ejecutar(actor, {
        titulo,
        modo,
        ...(segundosPorIntervencion === undefined ? {} : { segundosPorIntervencion }),
        cuerpoId: CUERPO_GENERAL,
        inicioLocal: "2026-11-03T14:00",
        finLocal: "2026-11-03T16:00",
        modalidad: "PRESENCIAL",
        ...extra,
      }),
  };
}

describe("CrearSesion", () => {
  it("crea y guarda una sesión programada", async () => {
    const e = crearEscenario();
    const sesion = await casoDeUso(e).ejecutar(superadmin, "Asamblea general", "CON_CODIGOS", 120);

    expect(sesion.estado).toBe("PROGRAMADA");
    expect(sesion.modo).toBe("CON_CODIGOS");
    expect(sesion.segundosPorIntervencion).toBe(120);
    expect(sesion.creadaEn).toEqual(e.reloj.ahora());
    expect(await e.sesiones.porId(sesion.id)).toBe(sesion);
    expect(e.unidad.ejecuciones).toBe(1);
  });

  it("usa los segundos por defecto", async () => {
    const e = crearEscenario();
    const sesion = await casoDeUso(e).ejecutar(superadmin, "Asamblea general", "SALA_ABIERTA");
    expect(sesion.segundosPorIntervencion).toBe(180);
  });

  it("reintenta si el código de sala ya existe", async () => {
    const e = crearEscenario(["AAAA", "AAAA", "BBBB"]);
    const primera = await casoDeUso(e).ejecutar(superadmin, "Primera sesión", "SALA_ABIERTA");
    const segunda = await casoDeUso(e).ejecutar(superadmin, "Segunda sesión", "SALA_ABIERTA");

    expect(primera.codigoDeSala.valor).toBe("AAAA");
    expect(segunda.codigoDeSala.valor).toBe("BBBB");
  });

  it("falla con SIN_CODIGO_DE_SALA_LIBRE tras 5 choques", async () => {
    const e = crearEscenario(["AAAA", "AAAA", "AAAA", "AAAA", "AAAA", "AAAA", "BBBB"]);
    await casoDeUso(e).ejecutar(superadmin, "Primera sesión", "SALA_ABIERTA");

    await expect(
      casoDeUso(e).ejecutar(superadmin, "Segunda sesión", "SALA_ABIERTA"),
    ).rejects.toMatchObject({
      codigo: "SIN_CODIGO_DE_SALA_LIBRE",
    });
    expect(await e.sesiones.listar()).toHaveLength(1);
  });

  it("propaga el error de título inválido", async () => {
    const e = crearEscenario();
    await expect(casoDeUso(e).ejecutar(superadmin, "ab", "SALA_ABIERTA")).rejects.toMatchObject({
      codigo: "TITULO_INVALIDO",
    });
  });

  it("guarda quién la creó", async () => {
    const e = crearEscenario();
    const sesion = await casoDeUso(e).ejecutar(demo, "Prueba de la mesa", "SALA_ABIERTA");
    expect(sesion.creadaPorId).toBe(demo.id);
    expect((await e.sesiones.porId(sesion.id))?.creadaPorId).toBe(demo.id);
  });

  describe("límite de la cuenta de prueba", () => {
    it("permite hasta 5 sesiones activas y rechaza la sexta con LIMITE_DE_DEMO", async () => {
      const e = crearEscenario();
      expect(LIMITE_DE_SESIONES_ACTIVAS_DE_DEMO).toBe(5);
      for (let i = 0; i < 5; i += 1) {
        await sembrarSesion(e, { creadaPorId: demo.id, estado: "EN_CURSO" });
      }
      await expect(
        casoDeUso(e).ejecutar(demo, "Una más de prueba", "SALA_ABIERTA"),
      ).rejects.toMatchObject({ codigo: "LIMITE_DE_DEMO" });
      expect(await e.sesiones.contarActivasDe(demo.id)).toBe(5);
    });

    it("las terminadas no cuentan", async () => {
      const e = crearEscenario();
      for (const estado of ["CERRADA", "ACTA_FINAL", "CANCELADA"] as const) {
        await sembrarSesion(e, { creadaPorId: demo.id, estado });
      }
      for (let i = 0; i < 4; i += 1) await sembrarSesion(e, { creadaPorId: demo.id });
      await expect(
        casoDeUso(e).ejecutar(demo, "La quinta activa", "SALA_ABIERTA"),
      ).resolves.toBeDefined();
    });

    it("tampoco puede tener más de 20 sesiones en total, aunque estén terminadas", async () => {
      const e = crearEscenario();
      expect(MAXIMO_DE_SESIONES_DE_DEMO).toBe(20);
      for (let i = 0; i < 20; i += 1) {
        await sembrarSesion(e, { creadaPorId: demo.id, estado: "CERRADA" });
      }
      await expect(
        casoDeUso(e).ejecutar(demo, "Crear y terminar sin fin", "SALA_ABIERTA"),
      ).rejects.toMatchObject({ codigo: "LIMITE_DE_SESIONES_DE_DEMO" });
      expect(await e.sesiones.contarDe(demo.id)).toBe(20);
      await expect(
        casoDeUso(e).ejecutar(superadmin, "Sin tope para la mesa", "SALA_ABIERTA"),
      ).resolves.toBeDefined();
    });

    it("el límite es de cada cuenta de prueba y no toca a SUPERADMIN ni MESA", async () => {
      const e = crearEscenario();
      for (let i = 0; i < 5; i += 1) await sembrarSesion(e, { creadaPorId: demo.id });
      await expect(
        casoDeUso(e).ejecutar(otraDemo, "Otra cuenta de prueba", "SALA_ABIERTA"),
      ).resolves.toBeDefined();
      for (let i = 0; i < 7; i += 1) {
        await casoDeUso(e).ejecutar(superadmin, `Sesión de la mesa ${i}`, "SALA_ABIERTA");
        await casoDeUso(e).ejecutar(mesa, `Sesión de la otra mesa ${i}`, "SALA_ABIERTA");
      }
    });
  });

  describe("cuerpo y horario", () => {
    it("convierte la hora local con la zona de la institución y guarda cuerpo, modalidad y lugar", async () => {
      const e = crearEscenario();
      const sesion = await casoDeUso(e).ejecutar(
        superadmin,
        "Asamblea de noche",
        "SALA_ABIERTA",
        undefined,
        {
          cuerpoId: CUERPO_MEDICINA,
          inicioLocal: "2026-11-03T23:30",
          finLocal: "2026-11-04T01:00",
          modalidad: "MIXTA",
          lugar: "Auditorio",
        },
      );
      expect(sesion.inicio.toISOString()).toBe("2026-11-04T04:30:00.000Z");
      expect(sesion.fin.toISOString()).toBe("2026-11-04T06:00:00.000Z");
      expect(sesion.cuerpoId).toBe(CUERPO_MEDICINA);
      expect(sesion.modalidad).toBe("MIXTA");
      expect(sesion.lugar).toBe("Auditorio");
    });

    it("el encargado de Ingeniería programa en Ingeniería y no en Medicina", async () => {
      const e = crearEscenario();
      await expect(
        casoDeUso(e).ejecutar(
          encargadoDeIngenieria,
          "Asamblea de Ingeniería",
          "SALA_ABIERTA",
          undefined,
          {
            cuerpoId: CUERPO_INGENIERIA,
          },
        ),
      ).resolves.toBeDefined();
      await expect(
        casoDeUso(e).ejecutar(
          encargadoDeIngenieria,
          "Asamblea de Medicina",
          "SALA_ABIERTA",
          undefined,
          {
            cuerpoId: CUERPO_MEDICINA,
          },
        ),
      ).rejects.toMatchObject({ codigo: "CUERPO_AJENO" });
    });

    it("la mesa de un cuerpo no programa", async () => {
      const e = crearEscenario();
      await expect(
        casoDeUso(e).ejecutar(
          mesaDeIngenieria,
          "Asamblea de Ingeniería",
          "SALA_ABIERTA",
          undefined,
          {
            cuerpoId: CUERPO_INGENIERIA,
          },
        ),
      ).rejects.toMatchObject({ codigo: "CUERPO_AJENO" });
    });

    it("nadie programa en un cuerpo archivado ni en uno que no existe", async () => {
      const e = crearEscenario();
      for (const actor of [superadmin, encargadoDeArchivado, demo]) {
        await expect(
          casoDeUso(e).ejecutar(actor, "En el archivado", "SALA_ABIERTA", undefined, {
            cuerpoId: CUERPO_ARCHIVADO,
          }),
        ).rejects.toMatchObject({ codigo: "CUERPO_AJENO" });
      }
      await expect(
        casoDeUso(e).ejecutar(superadmin, "En ninguno", "SALA_ABIERTA", undefined, {
          cuerpoId: "nada",
        }),
      ).rejects.toMatchObject({ codigo: "CUERPO_AJENO" });
    });

    it("la cuenta de prueba programa en cualquier cuerpo y la sesión queda marcada", async () => {
      const e = crearEscenario();
      const sesion = await casoDeUso(e).ejecutar(
        demo,
        "Prueba en Medicina",
        "SALA_ABIERTA",
        undefined,
        {
          cuerpoId: CUERPO_MEDICINA,
        },
      );
      expect(sesion.creadaPorDemo).toBe(true);
    });

    it("rechaza horas mal escritas y fin antes del inicio", async () => {
      const e = crearEscenario();
      await expect(
        casoDeUso(e).ejecutar(superadmin, "Mal escrita", "SALA_ABIERTA", undefined, {
          inicioLocal: "3/11/2026 14:00",
        }),
      ).rejects.toMatchObject({ codigo: "FECHA_INVALIDA" });
      await expect(
        casoDeUso(e).ejecutar(superadmin, "Al revés", "SALA_ABIERTA", undefined, {
          finLocal: "2026-11-03T13:00",
        }),
      ).rejects.toMatchObject({ codigo: "HORARIO_INVALIDO" });
    });
  });
});
