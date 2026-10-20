import { describe, expect, it } from "vitest";
import { esquemaEstadoDeSala, type EstadoDeSala as EstadoDelContrato } from "@kuorum/contracts";
import { Pregunta, SolicitudDePalabra } from "@kuorum/domain";
import { ConsultarEstadoDeSala, etiquetaDeEstado, type EstadoDeSala } from "../../src/index.js";
import {
  crearEscenario,
  opcionDe,
  sembrarPregunta,
  sembrarSesion,
  type Escenario,
} from "../dobles/escenario.js";

function consulta(e: Escenario) {
  return new ConsultarEstadoDeSala(
    e.sesiones,
    e.participantes,
    e.preguntas,
    e.votos,
    e.solicitudes,
    e.reloj,
  );
}

function solicitud(
  e: Escenario,
  sesionId: string,
  id: string,
  nombre: string,
  minutos: number,
  extra: Partial<Parameters<typeof SolicitudDePalabra.reconstruir>[0]> = {},
) {
  return SolicitudDePalabra.reconstruir({
    id,
    sesionId,
    participanteId: `p-${id}`,
    nombreVisible: nombre,
    tipo: "INTERVENCION",
    mocion: null,
    estado: "ESPERANDO",
    pedidaEn: new Date(e.reloj.ahora().getTime() + minutos * 60_000),
    inicioEn: null,
    finEn: null,
    segundosExtra: 0,
    ...extra,
  });
}

describe("ConsultarEstadoDeSala", () => {
  it("sala sin pregunta ni fila: asistencia null en sala abierta, pasa el contrato", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e, { estado: "EN_CURSO" });
    const estado = await consulta(e).ejecutar(sesion.codigoDeSala.valor);
    const delContrato: EstadoDelContrato = estado;
    const deApplication: EstadoDeSala = delContrato;
    expect(deApplication).toBe(estado);
    const analizado = esquemaEstadoDeSala.parse(estado);
    expect(analizado).toEqual(estado);
    expect(estado.sala).toEqual({
      codigo: sesion.codigoDeSala.valor,
      titulo: "Asamblea general",
      estado: "EN_CURSO",
      modo: "SALA_ABIERTA",
      indicativa: true,
    });
    expect(estado.asistencia).toBeNull();
    expect(estado.pregunta).toBeNull();
    expect(estado.palabra).toEqual({ conLaPalabra: null, fila: [] });
    expect(estado.horaDelServidor).toBe("2026-10-20T12:00:00.000Z");
  });

  it("con códigos: asistencia es el conteo de activos y no es indicativa", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e, { modo: "CON_CODIGOS", estado: "EN_CURSO" });
    for (const id of ["a", "b"]) {
      await e.participantes.crear({
        id,
        sesionId: sesion.id,
        credencial: "CODIGO",
        hash: `h-${id}`,
        creadoEn: e.reloj.ahora(),
      });
    }
    const estado = await consulta(e).ejecutar(sesion.codigoDeSala.valor);
    expect(estado.asistencia).toBe(2);
    expect(estado.sala.indicativa).toBe(false);
  });

  it("sala abierta con participantes: asistencia sigue en null", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e, { modo: "SALA_ABIERTA", estado: "EN_CURSO" });
    await e.participantes.crear({
      id: "ana",
      sesionId: sesion.id,
      credencial: "NAVEGADOR",
      hash: "h-ana",
      creadoEn: e.reloj.ahora(),
    });
    const estado = await consulta(e).ejecutar(sesion.codigoDeSala.valor);
    expect(estado.asistencia).toBeNull();
  });

  it("pregunta abierta: opciones, votos emitidos y sin resultado", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e, { estado: "EN_CURSO" });
    const pregunta = await sembrarPregunta(e, sesion.id, "ABIERTA");
    await e.votos.emitir(pregunta.id, "p1", opcionDe(pregunta, 0));
    await e.votos.emitir(pregunta.id, "p2", opcionDe(pregunta, 1));
    const estado = await consulta(e).ejecutar(sesion.codigoDeSala.valor);
    esquemaEstadoDeSala.parse(estado);
    expect(estado.pregunta).toEqual({
      id: pregunta.id,
      texto: "¿Aprobamos el acta anterior?",
      estado: "ABIERTA",
      secreta: true,
      opciones: pregunta.opciones.map((o) => ({ id: o.id, texto: o.texto })),
      votosEmitidos: 2,
      resultado: null,
    });
  });

  it("pregunta cerrada sin proyectar no se muestra", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e, { estado: "EN_CURSO" });
    await sembrarPregunta(e, sesion.id, "CERRADA");
    const estado = await consulta(e).ejecutar(sesion.codigoDeSala.valor);
    expect(estado.pregunta).toBeNull();
  });

  it("resultado visible: calcula porcentajes y aprobación", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e, { estado: "EN_CURSO" });
    const base = await sembrarPregunta(e, sesion.id, "CERRADA");
    base.proyectarResultado();
    await e.preguntas.guardar(base);
    await e.votos.emitir(base.id, "p1", opcionDe(base, 0));
    await e.votos.emitir(base.id, "p2", opcionDe(base, 0));
    await e.votos.emitir(base.id, "p3", opcionDe(base, 0));
    await e.votos.emitir(base.id, "p4", opcionDe(base, 1));
    const estado = await consulta(e).ejecutar(sesion.codigoDeSala.valor);
    esquemaEstadoDeSala.parse(estado);
    expect(estado.pregunta?.estado).toBe("CERRADA");
    expect(estado.pregunta?.votosEmitidos).toBe(4);
    expect(estado.pregunta?.resultado).toEqual({
      totalVotos: 4,
      porOpcion: [
        { opcionId: opcionDe(base, 0), texto: "Sí", votos: 3, porcentaje: 75 },
        { opcionId: opcionDe(base, 1), texto: "No", votos: 1, porcentaje: 25 },
        { opcionId: opcionDe(base, 2), texto: "Me abstengo", votos: 0, porcentaje: 0 },
      ],
      ganadora: opcionDe(base, 0),
      aprobada: true,
    });
  });

  it("la abierta gana a una cerrada visible; entre cerradas visibles, la más reciente", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e, { estado: "EN_CURSO" });
    const cerrada = (id: string, minutos: number) =>
      Pregunta.reconstruir({
        id,
        sesionId: sesion.id,
        texto: `Pregunta ${id}`,
        opciones: Pregunta.nueva(sesion.id, "xxxxx", ["Sí", "No"], e.ids).opciones,
        estado: "CERRADA",
        abiertaEn: e.reloj.ahora(),
        cerradaEn: new Date(e.reloj.ahora().getTime() + minutos * 60_000),
        resultadoVisible: true,
      });
    await e.preguntas.guardar(cerrada("vieja", 1));
    await e.preguntas.guardar(cerrada("reciente", 5));
    let estado = await consulta(e).ejecutar(sesion.codigoDeSala.valor);
    expect(estado.pregunta?.id).toBe("reciente");

    const abierta = await sembrarPregunta(e, sesion.id, "ABIERTA");
    estado = await consulta(e).ejecutar(sesion.codigoDeSala.valor);
    expect(estado.pregunta?.id).toBe(abierta.id);
  });

  it("palabra: con la palabra con tiempo total y fila ordenada (mociones primero)", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e, { estado: "EN_CURSO" });
    await e.solicitudes.guardar(
      solicitud(e, sesion.id, "habla", "Ana", 0, {
        estado: "CON_LA_PALABRA",
        inicioEn: e.reloj.ahora(),
        segundosExtra: 60,
      }),
    );
    await e.solicitudes.guardar(solicitud(e, sesion.id, "s2", "Beto", 2));
    await e.solicitudes.guardar(solicitud(e, sesion.id, "s1", "Carla", 1));
    await e.solicitudes.guardar(
      solicitud(e, sesion.id, "m1", "Dani", 3, { tipo: "MOCION", mocion: "ORDEN" }),
    );
    await e.solicitudes.guardar(solicitud(e, sesion.id, "ret", "Eva", 0, { estado: "RETIRADA" }));
    const estado = await consulta(e).ejecutar(sesion.codigoDeSala.valor);
    esquemaEstadoDeSala.parse(estado);
    expect(estado.palabra.conLaPalabra).toEqual({
      id: "habla",
      nombre: "Ana",
      tipo: "INTERVENCION",
      mocion: null,
      inicioEn: "2026-10-20T12:00:00.000Z",
      segundosTotales: 240,
    });
    expect(estado.palabra.fila.map((s) => s.id)).toEqual(["m1", "s1", "s2"]);
    expect(estado.palabra.fila[0]).toEqual({
      id: "m1",
      nombre: "Dani",
      tipo: "MOCION",
      mocion: "ORDEN",
    });
  });

  it("sesión cerrada todavía devuelve estado", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e, { estado: "CERRADA" });
    const estado = await consulta(e).ejecutar(sesion.codigoDeSala.valor);
    expect(estado.sala.estado).toBe("CERRADA");
  });

  it("código mal formado o inexistente: SALA_NO_DISPONIBLE", async () => {
    const e = crearEscenario();
    await expect(consulta(e).ejecutar("??")).rejects.toMatchObject({
      codigo: "SALA_NO_DISPONIBLE",
    });
    await expect(consulta(e).ejecutar("ABCD")).rejects.toMatchObject({
      codigo: "SALA_NO_DISPONIBLE",
    });
  });

  it("etiquetaDeEstado combina versión y votos emitidos", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e, { estado: "EN_CURSO" });
    const sinPregunta = await consulta(e).ejecutar(sesion.codigoDeSala.valor);
    expect(etiquetaDeEstado(sinPregunta)).toBe("0-0");
    const pregunta = await sembrarPregunta(e, sesion.id, "ABIERTA");
    await e.votos.emitir(pregunta.id, "p1", opcionDe(pregunta, 0));
    const conVoto: EstadoDeSala = await consulta(e).ejecutar(sesion.codigoDeSala.valor);
    expect(etiquetaDeEstado(conVoto)).toBe("0-1");
  });
});
