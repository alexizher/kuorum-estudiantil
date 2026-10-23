import {
  CodigoDeVerificacion,
  SolicitudDePalabra,
  type EstadoDeSolicitud,
  type TipoDeMocion,
} from "@kuorum/domain";
import { describe, expect, it } from "vitest";
import {
  AnularPregunta,
  CerrarPregunta,
  EditarActa,
  FinalizarActa,
  ListarActasPublicas,
  ObtenerActaDeLaMesa,
  ObtenerActaPublica,
  TerminarSesion,
  VerificarActa,
} from "../../src/index.js";
import { crearEscenario, opcionDe, sembrarPregunta, sembrarSesion } from "../dobles/escenario.js";
import { CUERPO_INGENIERIA, demo, encargadoDeMedicina, superadmin } from "../dobles/actores.js";

type E = ReturnType<typeof crearEscenario>;

const casos = (e: E) => ({
  terminar: new TerminarSesion(e.sesiones, e.preguntas, e.unidad, e.actas),
  cerrar: new CerrarPregunta(
    e.preguntas,
    e.sesiones,
    e.votos,
    e.reloj,
    e.unidad,
    e.decisiones,
    e.participantes,
    e.ids,
  ),
  obtener: new ObtenerActaDeLaMesa(
    e.sesiones,
    e.actas,
    e.cuerpos,
    e.institucion,
    e.decisiones,
    e.preguntas,
    e.solicitudes,
    e.participantes,
  ),
  editar: new EditarActa(e.sesiones, e.actas, e.unidad),
  finalizar: new FinalizarActa(
    e.sesiones,
    e.actas,
    e.cuerpos,
    e.institucion,
    e.decisiones,
    e.preguntas,
    e.solicitudes,
    e.participantes,
    e.codigos,
    e.reloj,
    e.unidad,
  ),
  listar: new ListarActasPublicas(e.actas, e.cuerpos),
  obtenerPublica: new ObtenerActaPublica(e.actas, e.sesiones),
  verificar: new VerificarActa(e.actas, e.sesiones),
});

let solicitudes = 0;
async function solicitud(
  e: E,
  sesionId: string,
  estado: EstadoDeSolicitud,
  mocion: TipoDeMocion | null = null,
) {
  solicitudes += 1;
  await e.solicitudes.guardar(
    SolicitudDePalabra.reconstruir({
      id: `sol-${solicitudes}`,
      sesionId,
      participanteId: "p",
      nombreVisible: "Nombre Secreto",
      tipo: mocion === null ? "INTERVENCION" : "MOCION",
      mocion,
      estado,
      pedidaEn: e.reloj.ahora(),
      inicioEn: null,
      finEn: null,
      segundosExtra: 0,
    }),
  );
}

/** Sesión con una decisión, una votación anulada después de cerrar (sin decisión) y la sala terminada. */
async function sesionTerminada(opciones: { modo?: "CON_CODIGOS"; creadaPorId?: string } = {}) {
  const e = crearEscenario();
  const c = casos(e);
  const sesion = await sembrarSesion(e, {
    estado: "EN_CURSO",
    cuerpoId: CUERPO_INGENIERIA,
    titulo: "Asamblea de Ingeniería",
    ...opciones,
  });
  const pregunta = await sembrarPregunta(e, sesion.id, "ABIERTA");
  await e.votos.emitir(pregunta.id, "p1", opcionDe(pregunta, 0));
  await c.cerrar.ejecutar(superadmin, pregunta.id);
  const anulada = await sembrarPregunta(e, sesion.id, "ABIERTA");
  await c.cerrar.ejecutar(superadmin, anulada.id);
  await new AnularPregunta(e.preguntas, e.sesiones, e.unidad, e.decisiones).ejecutar(
    superadmin,
    anulada.id,
  );
  await c.terminar.ejecutar(superadmin, sesion.id);
  return { e, c, sesion, pregunta };
}

describe("TerminarSesion crea el acta en borrador", () => {
  it("al terminar queda un borrador vacío", async () => {
    const { e, sesion } = await sesionTerminada();
    const acta = await e.actas.deSesion(sesion.id);
    expect(acta?.estado).toBe("BORRADOR");
    expect(acta?.desarrollo).toBe("");
  });

  it("no pisa un borrador que ya existía", async () => {
    const e = crearEscenario();
    const c = casos(e);
    const sesion = await sembrarSesion(e, { estado: "EN_CURSO" });
    const { Acta } = await import("@kuorum/domain");
    const previa = Acta.borrador(sesion.id);
    previa.editar("Ya escrito");
    await e.actas.guardar(previa);
    await c.terminar.ejecutar(superadmin, sesion.id);
    expect((await e.actas.deSesion(sesion.id))?.desarrollo).toBe("Ya escrito");
  });
});

describe("ObtenerActaDeLaMesa y EditarActa", () => {
  it("la vista previa trae los campos del sistema y lo escrito", async () => {
    const { e, c, sesion } = await sesionTerminada();
    await c.editar.ejecutar(superadmin, sesion.id, "Se discutió el presupuesto.");
    const { acta, vistaPrevia } = await c.obtener.ejecutar(superadmin, sesion.id);
    expect(acta.desarrollo).toBe("Se discutió el presupuesto.");
    expect(vistaPrevia.desarrollo).toBe("Se discutió el presupuesto.");
    expect(vistaPrevia.cuerpo).toBe("Ingeniería");
    expect(vistaPrevia.titulo).toBe("Asamblea de Ingeniería");
    expect(vistaPrevia.decisiones).toHaveLength(1);
    expect(await e.decisiones.deSesion(sesion.id)).toHaveLength(1);
  });

  it("quien no conduce recibe SESION_AJENA", async () => {
    const { c, sesion } = await sesionTerminada();
    for (const actor of [encargadoDeMedicina, demo]) {
      await expect(c.obtener.ejecutar(actor, sesion.id)).rejects.toMatchObject({
        codigo: "SESION_AJENA",
      });
      await expect(c.editar.ejecutar(actor, sesion.id, "x")).rejects.toMatchObject({
        codigo: "SESION_AJENA",
      });
    }
  });

  it("una sesión sin terminar no tiene acta", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e, { estado: "EN_CURSO" });
    await expect(casos(e).obtener.ejecutar(superadmin, sesion.id)).rejects.toMatchObject({
      codigo: "ACTA_NO_ENCONTRADA",
    });
    await expect(casos(e).editar.ejecutar(superadmin, sesion.id, "x")).rejects.toMatchObject({
      codigo: "ACTA_NO_ENCONTRADA",
    });
  });
});

describe("FinalizarActa", () => {
  it("arma el contenido, cuenta intervenciones y mociones y pasa a ACTA_FINAL", async () => {
    const { e, c, sesion } = await sesionTerminada({ modo: "CON_CODIGOS" });
    await e.participantes.guardarCodigos(sesion.id, ["a", "b"]);
    await e.participantes.activarCodigo(sesion.id, "a");
    await solicitud(e, sesion.id, "TERMINADA");
    await solicitud(e, sesion.id, "CON_LA_PALABRA");
    await solicitud(e, sesion.id, "ESPERANDO");
    await solicitud(e, sesion.id, "RETIRADA");
    await solicitud(e, sesion.id, "TERMINADA", "ORDEN");
    await solicitud(e, sesion.id, "RECHAZADA", "ORDEN");
    await solicitud(e, sesion.id, "RETIRADA", "ORDEN");
    await solicitud(e, sesion.id, "ESPERANDO", "ACLARACION");
    await solicitud(e, sesion.id, "CON_LA_PALABRA", "PROCEDIMIENTO");
    await c.editar.ejecutar(superadmin, sesion.id, "Texto final.");

    const codigo = await c.finalizar.ejecutar(superadmin, sesion.id);

    const acta = await e.actas.deSesion(sesion.id);
    expect(acta?.estado).toBe("FINAL");
    expect(acta?.codigo?.valor).toBe(codigo.valor);
    expect(acta?.finalizadaEn).toEqual(e.reloj.ahora());
    expect(sesion.estado).toBe("ACTA_FINAL");
    const contenido = acta?.contenido;
    expect(contenido?.desarrollo).toBe("Texto final.");
    expect(contenido?.asistentes).toBe(1);
    expect(contenido?.intervenciones).toBe(2);
    expect(contenido?.mociones).toEqual({
      ORDEN: 2,
      PROCEDIMIENTO: 1,
      ACLARACION: 0,
      SUFICIENTE_ILUSTRACION: 0,
    });
    expect(contenido?.decisiones).toHaveLength(1);
    expect(contenido?.institucion).toBe((await e.institucion.obtener()).nombre);
    expect(JSON.stringify(contenido)).not.toContain("Nombre Secreto");
  });

  it("en sala abierta la asistencia es null", async () => {
    const { e, c, sesion } = await sesionTerminada();
    await c.finalizar.ejecutar(superadmin, sesion.id);
    expect((await e.actas.deSesion(sesion.id))?.contenido?.asistentes).toBeNull();
  });

  it("finalizar dos veces o editar después da ACTA_FINALIZADA y el texto no cambia", async () => {
    const { e, c, sesion } = await sesionTerminada();
    await c.editar.ejecutar(superadmin, sesion.id, "Primero.");
    const codigo = await c.finalizar.ejecutar(superadmin, sesion.id);
    await expect(c.finalizar.ejecutar(superadmin, sesion.id)).rejects.toMatchObject({
      codigo: "ACTA_FINALIZADA",
    });
    await expect(c.editar.ejecutar(superadmin, sesion.id, "Otro.")).rejects.toMatchObject({
      codigo: "ACTA_FINALIZADA",
    });
    const acta = await e.actas.deSesion(sesion.id);
    expect(acta?.desarrollo).toBe("Primero.");
    expect(acta?.contenido?.desarrollo).toBe("Primero.");
    expect(acta?.codigo?.valor).toBe(codigo.valor);
  });

  it("en EN_CURSO da TRANSICION_INVALIDA", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e, { estado: "EN_CURSO" });
    await expect(casos(e).finalizar.ejecutar(superadmin, sesion.id)).rejects.toMatchObject({
      codigo: "TRANSICION_INVALIDA",
    });
    expect(sesion.estado).toBe("EN_CURSO");
  });

  it("quien no conduce recibe SESION_AJENA", async () => {
    const { c, sesion } = await sesionTerminada();
    await expect(c.finalizar.ejecutar(encargadoDeMedicina, sesion.id)).rejects.toMatchObject({
      codigo: "SESION_AJENA",
    });
    expect(sesion.estado).toBe("CERRADA");
  });

  it("si el código choca con otra acta, prueba otro", async () => {
    const { e, c, sesion } = await sesionTerminada();
    const { Acta } = await import("@kuorum/domain");
    const otra = Acta.borrador("otra-sesion");
    const primerCodigo = CodigoDeVerificacion.crear("2222222222");
    otra.finalizar(
      (await c.obtener.ejecutar(superadmin, sesion.id)).vistaPrevia,
      primerCodigo,
      e.reloj.ahora(),
    );
    await e.actas.guardar(otra);
    const codigo = await c.finalizar.ejecutar(superadmin, sesion.id);
    expect(codigo.valor).not.toBe(primerCodigo.valor);
  });
});

describe("Actas públicas", () => {
  const rango = {
    desde: new Date("2026-10-01T00:00:00Z"),
    hasta: new Date("2026-11-01T00:00:00Z"),
  };

  it("una acta final se lista, se obtiene y se verifica con el código mal escrito", async () => {
    const { c, sesion } = await sesionTerminada();
    const codigo = await c.finalizar.ejecutar(superadmin, sesion.id);
    expect(await c.listar.ejecutar(rango)).toHaveLength(1);
    expect(await c.listar.ejecutar({ ...rango, cuerpoSlug: "medicina" })).toHaveLength(0);
    const publica = await c.obtenerPublica.ejecutar(sesion.id);
    expect(publica.acta.codigo?.valor).toBe(codigo.valor);
    const resumen = await c.verificar.ejecutar(` ${codigo.valor.replace("-", "").toLowerCase()} `);
    expect(resumen?.sesionId).toBe(sesion.id);
    expect(resumen?.codigo).toBe(codigo.valor);
  });

  it("el borrador no aparece y su página da ACTA_NO_ENCONTRADA", async () => {
    const { c, sesion } = await sesionTerminada();
    expect(await c.listar.ejecutar(rango)).toHaveLength(0);
    await expect(c.obtenerPublica.ejecutar(sesion.id)).rejects.toMatchObject({
      codigo: "ACTA_NO_ENCONTRADA",
    });
  });

  it("la de la cuenta de prueba no aparece ni se verifica", async () => {
    const { c, sesion } = await sesionTerminada({ creadaPorId: demo.id });
    const codigo = await c.finalizar.ejecutar(demo, sesion.id);
    expect(await c.listar.ejecutar(rango)).toHaveLength(0);
    await expect(c.obtenerPublica.ejecutar(sesion.id)).rejects.toMatchObject({
      codigo: "ACTA_NO_ENCONTRADA",
    });
    expect(await c.verificar.ejecutar(codigo.valor)).toBeNull();
  });

  it("un código inexistente o mal formado devuelve null", async () => {
    const { c } = await sesionTerminada();
    expect(await c.verificar.ejecutar("ZZZZZ-ZZZZZ")).toBeNull();
    expect(await c.verificar.ejecutar("hola")).toBeNull();
  });

  it("valida el rango y el cuerpo", async () => {
    const { c } = await sesionTerminada();
    await expect(
      c.listar.ejecutar({ desde: rango.hasta, hasta: rango.desde }),
    ).rejects.toMatchObject({
      codigo: "RANGO_INVALIDO",
    });
    await expect(c.listar.ejecutar({ ...rango, cuerpoSlug: "nada" })).rejects.toMatchObject({
      codigo: "CUERPO_NO_EXISTE",
    });
  });
});
