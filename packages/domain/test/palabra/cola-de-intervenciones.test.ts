import { describe, expect, it } from "vitest";
import {
  ColaDeIntervenciones,
  ErrorDeDominio,
  SolicitudDePalabra,
  PRIORIDAD_DE_MOCION,
  DESCRIPCION_DE_MOCION,
  type GeneradorDeIds,
  type Reloj,
} from "../../src/index.js";

class RelojFalso implements Reloj {
  constructor(private t: number) {}
  ahora(): Date {
    return new Date(this.t);
  }
  avanzar(segundos: number): void {
    this.t += segundos * 1000;
  }
}

function ids(): GeneradorDeIds {
  let n = 0;
  return { nuevo: () => `sol-${++n}` };
}

function codigoDeError(operacion: () => unknown): string {
  try {
    operacion();
  } catch (error) {
    if (error instanceof ErrorDeDominio) return error.codigo;
    throw error;
  }
  throw new Error("no lanzó");
}

function nuevaCola() {
  const reloj = new RelojFalso(Date.parse("2026-10-20T10:00:00Z"));
  const generador = ids();
  const cola = new ColaDeIntervenciones([], 180, "s-1");
  const pedirIntervencion = (p: string) => {
    reloj.avanzar(1);
    return cola.pedir({ participanteId: p, nombreVisible: `Nombre ${p}`, tipo: "INTERVENCION" }, reloj, generador);
  };
  const pedirMocion = (p: string, mocion: "ORDEN" | "PROCEDIMIENTO" | "ACLARACION" | "SUFICIENTE_ILUSTRACION") => {
    reloj.avanzar(1);
    return cola.pedir({ participanteId: p, nombreVisible: `Nombre ${p}`, tipo: "MOCION", mocion }, reloj, generador);
  };
  return { reloj, generador, cola, pedirIntervencion, pedirMocion };
}

describe("tipos de moción", () => {
  it("prioridades y descripciones", () => {
    expect(PRIORIDAD_DE_MOCION).toEqual({
      ORDEN: 1,
      PROCEDIMIENTO: 2,
      ACLARACION: 3,
      SUFICIENTE_ILUSTRACION: 4,
    });
    for (const tipo of Object.keys(PRIORIDAD_DE_MOCION)) {
      expect(DESCRIPCION_DE_MOCION[tipo as keyof typeof DESCRIPCION_DE_MOCION].length).toBeGreaterThan(10);
    }
  });
});

describe("ColaDeIntervenciones", () => {
  it("ordena mociones por prioridad y llegada, luego intervenciones por llegada", () => {
    const { cola, pedirIntervencion, pedirMocion } = nuevaCola();
    const i1 = pedirIntervencion("a");
    const suf = pedirMocion("b", "SUFICIENTE_ILUSTRACION");
    const i2 = pedirIntervencion("c");
    const orden = pedirMocion("d", "ORDEN");
    const i3 = pedirIntervencion("e");
    expect(cola.enEspera().map((s) => s.id)).toEqual([orden.id, suf.id, i1.id, i2.id, i3.id]);
  });

  it("mociones del mismo tipo van por llegada", () => {
    const { cola, pedirMocion } = nuevaCola();
    const m1 = pedirMocion("a", "ACLARACION");
    const m2 = pedirMocion("b", "ACLARACION");
    expect(cola.enEspera().map((s) => s.id)).toEqual([m1.id, m2.id]);
  });

  it("dar la palabra fuera de turno conserva el orden del resto", () => {
    const { cola, reloj, pedirIntervencion, pedirMocion } = nuevaCola();
    const orden = pedirMocion("a", "ORDEN");
    const i1 = pedirIntervencion("b");
    const i2 = pedirIntervencion("c");
    const i3 = pedirIntervencion("d");
    cola.darLaPalabra(i2.id, reloj);
    expect(cola.conLaPalabra()?.id).toBe(i2.id);
    expect(cola.enEspera().map((s) => s.id)).toEqual([orden.id, i1.id, i3.id]);
  });

  it("darLaPalabra(null) toma la primera y termina a quien hablaba", () => {
    const { cola, reloj, pedirIntervencion, pedirMocion } = nuevaCola();
    const i1 = pedirIntervencion("a");
    const m = pedirMocion("b", "PROCEDIMIENTO");
    cola.darLaPalabra(null, reloj);
    expect(cola.conLaPalabra()?.id).toBe(m.id);
    reloj.avanzar(10);
    cola.darLaPalabra(null, reloj);
    expect(cola.conLaPalabra()?.id).toBe(i1.id);
    expect(m.estado).toBe("TERMINADA");
    expect(m.finEn).toEqual(reloj.ahora());
    expect(i1.inicioEn).toEqual(reloj.ahora());
  });

  it("fila vacía y solicitud no disponible", () => {
    const { cola, reloj, pedirIntervencion } = nuevaCola();
    expect(codigoDeError(() => cola.darLaPalabra(null, reloj))).toBe("FILA_VACIA");
    const i1 = pedirIntervencion("a");
    cola.darLaPalabra(i1.id, reloj);
    expect(codigoDeError(() => cola.darLaPalabra(i1.id, reloj))).toBe("SOLICITUD_NO_DISPONIBLE");
    expect(codigoDeError(() => cola.darLaPalabra("nada", reloj))).toBe("SOLICITUD_NO_DISPONIBLE");
    expect(i1.estado).toBe("CON_LA_PALABRA");
  });

  it("si falla darLaPalabra no termina a quien habla", () => {
    const { cola, reloj, pedirIntervencion } = nuevaCola();
    const i1 = pedirIntervencion("a");
    cola.darLaPalabra(i1.id, reloj);
    expect(codigoDeError(() => cola.darLaPalabra(null, reloj))).toBe("FILA_VACIA");
    expect(codigoDeError(() => cola.darLaPalabra("nada", reloj))).toBe("SOLICITUD_NO_DISPONIBLE");
    expect(cola.conLaPalabra()?.id).toBe(i1.id);
  });

  it("retirar: solo el dueño y solo si espera", () => {
    const { cola, pedirIntervencion } = nuevaCola();
    const i1 = pedirIntervencion("a");
    expect(codigoDeError(() => cola.retirar(i1.id, "otro"))).toBe("NO_ES_TUYA");
    expect(codigoDeError(() => cola.retirar("nada", "a"))).toBe("SOLICITUD_NO_DISPONIBLE");
    cola.retirar(i1.id, "a");
    expect(i1.estado).toBe("RETIRADA");
    expect(cola.enEspera()).toEqual([]);
    expect(codigoDeError(() => cola.retirar(i1.id, "a"))).toBe("SOLICITUD_NO_DISPONIBLE");
  });

  it("no permite dos solicitudes esperando del mismo tipo", () => {
    const { cola, reloj, generador, pedirIntervencion, pedirMocion } = nuevaCola();
    pedirIntervencion("a");
    expect(
      codigoDeError(() =>
        cola.pedir({ participanteId: "a", nombreVisible: "A", tipo: "INTERVENCION" }, reloj, generador),
      ),
    ).toBe("YA_EN_LA_FILA");
    expect(() => pedirMocion("a", "ORDEN")).not.toThrow();
    expect(codigoDeError(() => pedirMocion("a", "ACLARACION"))).toBe("YA_EN_LA_FILA");
  });

  it("puede volver a pedir tras retirarse o hablar", () => {
    const { cola, reloj, pedirIntervencion } = nuevaCola();
    const i1 = pedirIntervencion("a");
    cola.retirar(i1.id, "a");
    const i2 = pedirIntervencion("a");
    cola.darLaPalabra(i2.id, reloj);
    expect(() => pedirIntervencion("a")).not.toThrow();
  });

  it("valida moción y nombre", () => {
    const { cola, reloj, generador } = nuevaCola();
    const pedir = (datos: Parameters<typeof cola.pedir>[0]) => () => cola.pedir(datos, reloj, generador);
    expect(codigoDeError(pedir({ participanteId: "a", nombreVisible: "A", tipo: "MOCION" }))).toBe("MOCION_INVALIDA");
    expect(
      codigoDeError(pedir({ participanteId: "a", nombreVisible: "A", tipo: "INTERVENCION", mocion: "ORDEN" })),
    ).toBe("MOCION_INVALIDA");
    expect(codigoDeError(pedir({ participanteId: "a", nombreVisible: "   ", tipo: "INTERVENCION" }))).toBe(
      "NOMBRE_VISIBLE_INVALIDO",
    );
    expect(
      codigoDeError(pedir({ participanteId: "a", nombreVisible: "x".repeat(61), tipo: "INTERVENCION" })),
    ).toBe("NOMBRE_VISIBLE_INVALIDO");
    const ok = cola.pedir({ participanteId: "a", nombreVisible: "  Valentina, Ingeniería ", tipo: "INTERVENCION" }, reloj, generador);
    expect(ok.nombreVisible).toBe("Valentina, Ingeniería");
    expect(ok.sesionId).toBe("s-1");
    expect(ok.mocion).toBeNull();
  });

  it("rechazar moción", () => {
    const { cola, reloj, pedirIntervencion, pedirMocion } = nuevaCola();
    const i1 = pedirIntervencion("a");
    const m = pedirMocion("b", "ORDEN");
    expect(codigoDeError(() => cola.rechazarMocion(i1.id))).toBe("SOLICITUD_NO_DISPONIBLE");
    cola.rechazarMocion(m.id);
    expect(m.estado).toBe("RECHAZADA");
    expect(cola.enEspera().map((s) => s.id)).toEqual([i1.id]);
    expect(codigoDeError(() => cola.rechazarMocion(m.id))).toBe("SOLICITUD_NO_DISPONIBLE");
    cola.darLaPalabra(i1.id, reloj);
    expect(codigoDeError(() => cola.rechazarMocion("nada"))).toBe("SOLICITUD_NO_DISPONIBLE");
  });

  it("minuto extra y segundos restantes", () => {
    const { cola, reloj, pedirIntervencion } = nuevaCola();
    expect(cola.segundosRestantes(reloj)).toBeNull();
    expect(cola.segundosExcedidos(reloj)).toBeNull();
    const i1 = pedirIntervencion("a");
    cola.darLaPalabra(i1.id, reloj);
    expect(cola.segundosRestantes(reloj)).toBe(180);
    reloj.avanzar(100);
    expect(cola.segundosRestantes(reloj)).toBe(80);
    cola.sumarMinuto();
    expect(i1.segundosExtra).toBe(60);
    expect(cola.segundosRestantes(reloj)).toBe(140);
    reloj.avanzar(140);
    expect(cola.segundosRestantes(reloj)).toBe(0);
    expect(cola.segundosExcedidos(reloj)).toBe(0);
    reloj.avanzar(25);
    expect(cola.segundosRestantes(reloj)).toBe(0);
    expect(cola.segundosExcedidos(reloj)).toBe(25);
  });

  it("terminar y sumarMinuto sin nadie con la palabra", () => {
    const { cola, reloj, pedirIntervencion } = nuevaCola();
    expect(codigoDeError(() => cola.terminar(reloj))).toBe("NADIE_CON_LA_PALABRA");
    expect(codigoDeError(() => cola.sumarMinuto())).toBe("NADIE_CON_LA_PALABRA");
    const i1 = pedirIntervencion("a");
    cola.darLaPalabra(i1.id, reloj);
    reloj.avanzar(5);
    cola.terminar(reloj);
    expect(i1.estado).toBe("TERMINADA");
    expect(cola.conLaPalabra()).toBeNull();
  });

  it("cambiadas devuelve solo lo modificado", () => {
    const sol = SolicitudDePalabra.reconstruir({
      id: "x", sesionId: "s-1", participanteId: "z", nombreVisible: "Z", tipo: "INTERVENCION",
      mocion: null, estado: "ESPERANDO", pedidaEn: new Date(0), inicioEn: null, finEn: null, segundosExtra: 0,
    });
    const cola = new ColaDeIntervenciones([sol], 180, "s-1");
    const reloj = new RelojFalso(1000);
    expect(cola.cambiadas()).toEqual([]);
    const nueva = cola.pedir({ participanteId: "a", nombreVisible: "A", tipo: "INTERVENCION" }, reloj, ids());
    expect(cola.cambiadas()).toEqual([nueva]);
    cola.darLaPalabra("x", reloj);
    expect(cola.cambiadas().map((s) => s.id).sort()).toEqual(["sol-1", "x"]);
  });
});
