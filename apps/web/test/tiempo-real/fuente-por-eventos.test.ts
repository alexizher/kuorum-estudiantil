import type { EstadoPublicoDeSesion } from "@kuorum/contracts";
import { describe, expect, it, vi } from "vitest";
import type { Temporizador } from "../../src/tiempo-real/fuente-de-estado";
import { FuenteDeEstadoPorEventos } from "../../src/tiempo-real/fuente-por-eventos";

class EventSourceFalso {
  readyState = 1;
  cerrado = false;
  onerror: (() => void) | null = null;
  escuchas = new Map<string, (e: { data: string }) => void>();
  constructor(readonly url: string) {}
  addEventListener(tipo: string, escucha: (e: { data: string }) => void): void {
    this.escuchas.set(tipo, escucha);
  }
  close(): void {
    this.cerrado = true;
    this.readyState = 2;
  }
  abrir(): void {
    this.escuchas.get("open")?.({ data: "" });
  }
  emitir(datos: unknown): void {
    this.escuchas.get("estado")?.({
      data: typeof datos === "string" ? datos : JSON.stringify(datos),
    });
  }
}

const estado: EstadoPublicoDeSesion = {
  sesionId: "s",
  estado: "EN_CURSO",
  version: 3,
  actualizadaEn: "2026-10-19T12:00:00.000Z",
};

function conexion(creados: EventSourceFalso[], i: number): EventSourceFalso {
  const es = creados[i];
  if (es === undefined) throw new Error(`no hay conexión ${i}`);
  return es;
}

function preparar() {
  const creados: EventSourceFalso[] = [];
  const esperas: number[] = [];
  let pendiente: (() => void) | undefined;
  const temporizador: Temporizador = {
    programar(accion, ms) {
      esperas.push(ms);
      pendiente = accion;
      return () => {
        pendiente = undefined;
      };
    },
  };
  const fuente = new FuenteDeEstadoPorEventos((url) => {
    const es = new EventSourceFalso(url);
    creados.push(es);
    return es as unknown as EventSource;
  }, temporizador);
  const disparar = () => {
    const accion = pendiente;
    pendiente = undefined;
    accion?.();
  };
  const fallar = (i: number) => {
    const es = conexion(creados, i);
    es.readyState = 2;
    es.onerror?.();
  };
  return { creados, esperas, fuente, disparar, fallar };
}

describe("FuenteDeEstadoPorEventos", () => {
  it("abre la URL de eventos y entrega el estado validado", () => {
    const { creados, fuente } = preparar();
    const alCambiar = vi.fn();
    fuente.suscribir("s", alCambiar);

    conexion(creados, 0).emitir(estado);

    expect(conexion(creados, 0).url).toBe("/api/public/v1/sesiones/s/eventos");
    expect(alCambiar).toHaveBeenCalledWith(estado);
  });

  it("ignora datos inválidos", () => {
    const { creados, fuente } = preparar();
    const alCambiar = vi.fn();
    fuente.suscribir("s", alCambiar);

    conexion(creados, 0).emitir("no es json");
    conexion(creados, 0).emitir({ basura: 1 });

    expect(alCambiar).not.toHaveBeenCalled();
  });

  it("reconecta tras la espera cuando la conexión queda cerrada", () => {
    const { creados, fuente, disparar, fallar, esperas } = preparar();
    const alCambiar = vi.fn();
    fuente.suscribir("s", alCambiar);

    fallar(0);
    expect(creados).toHaveLength(1);
    disparar();
    conexion(creados, 1).emitir(estado);

    expect(esperas).toEqual([1000]);
    expect(creados).toHaveLength(2);
    expect(conexion(creados, 0).cerrado).toBe(true);
    expect(alCambiar).toHaveBeenCalledOnce();
  });

  it("no crea otra conexión si el navegador ya está reintentando", () => {
    const { creados, fuente } = preparar();
    fuente.suscribir("s", vi.fn());

    conexion(creados, 0).readyState = 0;
    conexion(creados, 0).onerror?.();

    expect(creados).toHaveLength(1);
  });

  it("cancelar cierra la conexión y no reconecta", () => {
    const { creados, fuente } = preparar();
    const cancelar = fuente.suscribir("s", vi.fn());

    cancelar();
    conexion(creados, 0).onerror?.();

    expect(conexion(creados, 0).cerrado).toBe(true);
    expect(creados).toHaveLength(1);
  });

  it("la espera crece al doble hasta 30 s y se reinicia al abrir", () => {
    const { creados, fuente, disparar, fallar, esperas } = preparar();
    fuente.suscribir("s", vi.fn());

    for (let i = 0; i < 7; i++) {
      fallar(i);
      disparar();
    }
    conexion(creados, 7).abrir();
    fallar(7);

    expect(esperas).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000, 1000]);
  });

  it("cancelar durante la espera impide reconectar", () => {
    const { creados, fuente, disparar, fallar } = preparar();
    const cancelar = fuente.suscribir("s", vi.fn());

    fallar(0);
    cancelar();
    disparar();

    expect(creados).toHaveLength(1);
  });
});
