import { describe, expect, it } from "vitest";
import {
  DarLaPalabra,
  PedirLaPalabra,
  PresentarMocion,
  RechazarMocion,
  RetirarSolicitud,
  SumarMinuto,
  TerminarIntervencion,
  TerminarSesion,
} from "../../src/index.js";
import { crearEscenario, sembrarSesion } from "../dobles/escenario.js";
import { superadmin } from "../dobles/actores.js";

async function montar(estado: "PROGRAMADA" | "EN_CURSO" | "CERRADA" = "EN_CURSO") {
  const e = crearEscenario();
  const sesion = await sembrarSesion(e, { estado });
  const otra = await sembrarSesion(e, { estado: "EN_CURSO" });
  const ana = {
    id: "ana",
    sesionId: sesion.id,
    credencial: "NAVEGADOR" as const,
    hash: "h1",
    creadoEn: e.reloj.ahora(),
  };
  const beto = {
    id: "beto",
    sesionId: sesion.id,
    credencial: "NAVEGADOR" as const,
    hash: "h2",
    creadoEn: e.reloj.ahora(),
  };
  const ajeno = {
    id: "ajeno",
    sesionId: otra.id,
    credencial: "NAVEGADOR" as const,
    hash: "h3",
    creadoEn: e.reloj.ahora(),
  };
  for (const p of [ana, beto, ajeno]) await e.participantes.crear(p);
  const pedir = new PedirLaPalabra(
    e.participantes,
    e.sesiones,
    e.solicitudes,
    e.reloj,
    e.ids,
    e.unidad,
  );
  const mocion = new PresentarMocion(
    e.participantes,
    e.sesiones,
    e.solicitudes,
    e.reloj,
    e.ids,
    e.unidad,
  );
  const retirar = new RetirarSolicitud(e.participantes, e.sesiones, e.solicitudes, e.unidad);
  const dar = new DarLaPalabra(e.sesiones, e.solicitudes, e.reloj, e.unidad);
  const terminar = new TerminarIntervencion(e.sesiones, e.solicitudes, e.reloj, e.unidad);
  const rechazar = new RechazarMocion(e.sesiones, e.solicitudes, e.unidad);
  const sumar = new SumarMinuto(e.sesiones, e.solicitudes, e.unidad);
  return { e, sesion, pedir, mocion, retirar, dar, terminar, rechazar, sumar };
}

describe("PedirLaPalabra", () => {
  it("crea la solicitud, devuelve su id y sube la versión", async () => {
    const { e, sesion, pedir } = await montar();
    const id = await pedir.ejecutar("ana", sesion.id, "Ana");
    const guardada = await e.solicitudes.porId(id);
    expect(guardada).toMatchObject({
      participanteId: "ana",
      tipo: "INTERVENCION",
      estado: "ESPERANDO",
    });
    expect(sesion.version).toBe(1);
  });

  it("falla si ya está en la fila", async () => {
    const { sesion, pedir } = await montar();
    await pedir.ejecutar("ana", sesion.id, "Ana");
    await expect(pedir.ejecutar("ana", sesion.id, "Ana")).rejects.toMatchObject({
      codigo: "YA_EN_LA_FILA",
    });
    expect(sesion.version).toBe(1);
  });

  it("falla si el participante es de otra sesión", async () => {
    const { sesion, pedir } = await montar();
    await expect(pedir.ejecutar("ajeno", sesion.id, "X")).rejects.toMatchObject({
      codigo: "PARTICIPANTE_AJENO",
    });
  });

  it("falla si el participante no existe", async () => {
    const { sesion, pedir } = await montar();
    await expect(pedir.ejecutar("nadie", sesion.id, "X")).rejects.toMatchObject({
      codigo: "PARTICIPANTE_AJENO",
    });
  });

  it("falla si la sesión no está en curso", async () => {
    const { sesion, pedir } = await montar("PROGRAMADA");
    await expect(pedir.ejecutar("ana", sesion.id, "Ana")).rejects.toMatchObject({
      codigo: "SESION_NO_EN_CURSO",
    });
  });

  it("falla si la sesión no existe", async () => {
    const { pedir } = await montar();
    await expect(pedir.ejecutar("ana", "nada", "Ana")).rejects.toMatchObject({
      codigo: "SESION_NO_ENCONTRADA",
    });
  });
});

describe("PresentarMocion", () => {
  it("crea una moción y devuelve su id", async () => {
    const { e, sesion, mocion } = await montar();
    const id = await mocion.ejecutar("ana", sesion.id, "Ana", "ORDEN");
    expect(await e.solicitudes.porId(id)).toMatchObject({ tipo: "MOCION", mocion: "ORDEN" });
    expect(sesion.version).toBe(1);
  });

  it("falla si el participante es de otra sesión", async () => {
    const { sesion, mocion } = await montar();
    await expect(mocion.ejecutar("ajeno", sesion.id, "X", "ORDEN")).rejects.toMatchObject({
      codigo: "PARTICIPANTE_AJENO",
    });
  });
});

describe("RetirarSolicitud", () => {
  it("retira la propia y sube la versión", async () => {
    const { e, sesion, pedir, retirar } = await montar();
    const id = await pedir.ejecutar("ana", sesion.id, "Ana");
    await retirar.ejecutar("ana", id);
    expect((await e.solicitudes.porId(id))?.estado).toBe("RETIRADA");
    expect(sesion.version).toBe(2);
  });

  it("falla con NO_ES_TUYA si es de otro", async () => {
    const { sesion, pedir, retirar } = await montar();
    const id = await pedir.ejecutar("ana", sesion.id, "Ana");
    await expect(retirar.ejecutar("beto", id)).rejects.toMatchObject({ codigo: "NO_ES_TUYA" });
  });

  it("falla con PARTICIPANTE_AJENO si es de otra sesión", async () => {
    const { sesion, pedir, retirar } = await montar();
    const id = await pedir.ejecutar("ana", sesion.id, "Ana");
    await expect(retirar.ejecutar("ajeno", id)).rejects.toMatchObject({
      codigo: "PARTICIPANTE_AJENO",
    });
  });

  it("falla con SESION_NO_EN_CURSO si la sesión terminó y la solicitud no cambia", async () => {
    const { e, sesion, pedir, retirar } = await montar();
    const id = await pedir.ejecutar("ana", sesion.id, "Ana");
    await new TerminarSesion(e.sesiones, e.preguntas, e.unidad, e.actas).ejecutar(
      superadmin,
      sesion.id,
    );
    const antes = { ...(await e.solicitudes.porId(id)) };
    const versionAntes = sesion.version;

    await expect(retirar.ejecutar("ana", id)).rejects.toMatchObject({
      codigo: "SESION_NO_EN_CURSO",
    });

    expect(await e.solicitudes.porId(id)).toEqual(antes);
    expect((await e.solicitudes.porId(id))?.estado).toBe("ESPERANDO");
    expect(sesion.version).toBe(versionAntes);
  });

  it("falla con SOLICITUD_NO_DISPONIBLE si no existe", async () => {
    const { retirar } = await montar();
    await expect(retirar.ejecutar("ana", "nada")).rejects.toMatchObject({
      codigo: "SOLICITUD_NO_DISPONIBLE",
    });
  });
});

describe("casos de la mesa", () => {
  it("DarLaPalabra con null da la palabra a la primera y la moción pasa primero", async () => {
    const { e, sesion, pedir, mocion, dar } = await montar();
    await pedir.ejecutar("ana", sesion.id, "Ana");
    const idMocion = await mocion.ejecutar("beto", sesion.id, "Beto", "ORDEN");
    await dar.ejecutar(superadmin, sesion.id, null);
    expect((await e.solicitudes.porId(idMocion))?.estado).toBe("CON_LA_PALABRA");
    expect(sesion.version).toBe(3);
  });

  it("DarLaPalabra con id elige esa y termina la actual", async () => {
    const { e, sesion, pedir, dar } = await montar();
    const a = await pedir.ejecutar("ana", sesion.id, "Ana");
    const b = await pedir.ejecutar("beto", sesion.id, "Beto");
    await dar.ejecutar(superadmin, sesion.id, a);
    await dar.ejecutar(superadmin, sesion.id, b);
    expect((await e.solicitudes.porId(a))?.estado).toBe("TERMINADA");
    expect((await e.solicitudes.porId(b))?.estado).toBe("CON_LA_PALABRA");
  });

  it("DarLaPalabra con fila vacía da FILA_VACIA", async () => {
    const { sesion, dar } = await montar();
    await expect(dar.ejecutar(superadmin, sesion.id, null)).rejects.toMatchObject({
      codigo: "FILA_VACIA",
    });
    expect(sesion.version).toBe(0);
  });

  it("TerminarIntervencion termina a quien habla", async () => {
    const { e, sesion, pedir, dar, terminar } = await montar();
    const a = await pedir.ejecutar("ana", sesion.id, "Ana");
    await dar.ejecutar(superadmin, sesion.id, a);
    await terminar.ejecutar(superadmin, sesion.id);
    expect((await e.solicitudes.porId(a))?.estado).toBe("TERMINADA");
  });

  it("TerminarIntervencion sin nadie da NADIE_CON_LA_PALABRA", async () => {
    const { sesion, terminar } = await montar();
    await expect(terminar.ejecutar(superadmin, sesion.id)).rejects.toMatchObject({
      codigo: "NADIE_CON_LA_PALABRA",
    });
  });

  it("RechazarMocion rechaza la moción", async () => {
    const { e, sesion, mocion, rechazar } = await montar();
    const id = await mocion.ejecutar("ana", sesion.id, "Ana", "ORDEN");
    await rechazar.ejecutar(superadmin, sesion.id, id);
    expect((await e.solicitudes.porId(id))?.estado).toBe("RECHAZADA");
  });

  it("RechazarMocion sobre una intervención da SOLICITUD_NO_DISPONIBLE", async () => {
    const { sesion, pedir, rechazar } = await montar();
    const id = await pedir.ejecutar("ana", sesion.id, "Ana");
    await expect(rechazar.ejecutar(superadmin, sesion.id, id)).rejects.toMatchObject({
      codigo: "SOLICITUD_NO_DISPONIBLE",
    });
  });

  it("SumarMinuto suma 60 segundos a quien habla", async () => {
    const { e, sesion, pedir, dar, sumar } = await montar();
    const a = await pedir.ejecutar("ana", sesion.id, "Ana");
    await dar.ejecutar(superadmin, sesion.id, a);
    await sumar.ejecutar(superadmin, sesion.id);
    expect((await e.solicitudes.porId(a))?.segundosExtra).toBe(60);
  });

  it("los casos de la mesa exigen sesión en curso", async () => {
    const { sesion, dar, terminar, rechazar, sumar } = await montar("CERRADA");
    for (const caso of [
      () => dar.ejecutar(superadmin, sesion.id, null),
      () => terminar.ejecutar(superadmin, sesion.id),
      () => rechazar.ejecutar(superadmin, sesion.id, "x"),
      () => sumar.ejecutar(superadmin, sesion.id),
    ]) {
      await expect(caso()).rejects.toMatchObject({ codigo: "SESION_NO_EN_CURSO" });
    }
  });

  it("falla si la sesión no existe", async () => {
    const { dar } = await montar();
    await expect(dar.ejecutar(superadmin, "nada", null)).rejects.toMatchObject({
      codigo: "SESION_NO_ENCONTRADA",
    });
  });
});
