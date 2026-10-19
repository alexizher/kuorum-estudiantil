import type { EstadoPublicoDeSesion } from "@kuorum/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FuenteDeEstadoPorConsulta } from "../../src/tiempo-real/fuente-por-consulta";
import type { Temporizador } from "../../src/tiempo-real/fuente-de-estado";

function estado(version: number): EstadoPublicoDeSesion {
  return {
    sesionId: "s",
    estado: "EN_CURSO",
    version,
    actualizadaEn: "2026-10-19T12:00:00.000Z",
  };
}

function ok(version: number): Response {
  return Response.json(estado(version), { headers: { ETag: `W/"s-${version}"` } });
}

class TemporizadorFalso implements Temporizador {
  pendientes: Array<() => void> = [];
  cancelados = 0;
  programar(accion: () => void): () => void {
    this.pendientes.push(accion);
    return () => {
      this.pendientes = this.pendientes.filter((p) => p !== accion);
      this.cancelados++;
    };
  }
  disparar(): void {
    const acciones = this.pendientes;
    this.pendientes = [];
    acciones.forEach((a) => a());
  }
}

const vaciar = () => new Promise((resolver) => setTimeout(resolver, 0));

describe("FuenteDeEstadoPorConsulta", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("dos respuestas 200 con versiones 1 y 2 llaman dos veces a alCambiar", async () => {
    const fetchFalso = vi.fn().mockResolvedValueOnce(ok(1)).mockResolvedValueOnce(ok(2));
    const temporizador = new TemporizadorFalso();
    const alCambiar = vi.fn();
    new FuenteDeEstadoPorConsulta(fetchFalso, 3000, temporizador).suscribir("s", alCambiar);

    await vaciar();
    temporizador.disparar();
    await vaciar();

    expect(alCambiar.mock.calls).toEqual([[estado(1)], [estado(2)]]);
    expect(fetchFalso.mock.calls[0]?.[0]).toBe("/api/public/v1/sesiones/s/estado");
  });

  it("un 304 no llama a alCambiar y la segunda petición lleva If-None-Match", async () => {
    const fetchFalso = vi
      .fn()
      .mockResolvedValueOnce(ok(1))
      .mockResolvedValueOnce(new Response(null, { status: 304 }));
    const temporizador = new TemporizadorFalso();
    const alCambiar = vi.fn();
    new FuenteDeEstadoPorConsulta(fetchFalso, 3000, temporizador).suscribir("s", alCambiar);

    await vaciar();
    temporizador.disparar();
    await vaciar();

    expect(alCambiar).toHaveBeenCalledOnce();
    const primera = fetchFalso.mock.calls[0]?.[1]?.headers ?? {};
    const segunda = fetchFalso.mock.calls[1]?.[1]?.headers ?? {};
    expect(primera).not.toHaveProperty("If-None-Match");
    expect(segunda).toHaveProperty("If-None-Match", 'W/"s-1"');
    expect(temporizador.pendientes).toHaveLength(1);
  });

  it("ignora cuerpos que no cumplen el contrato y sigue consultando", async () => {
    const fetchFalso = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ basura: true }))
      .mockResolvedValueOnce(ok(2));
    const temporizador = new TemporizadorFalso();
    const alCambiar = vi.fn();
    new FuenteDeEstadoPorConsulta(fetchFalso, 3000, temporizador).suscribir("s", alCambiar);

    await vaciar();
    temporizador.disparar();
    await vaciar();

    expect(alCambiar.mock.calls).toEqual([[estado(2)]]);
  });

  it("sigue consultando tras un error de red", async () => {
    const fetchFalso = vi.fn().mockRejectedValueOnce(new Error("red")).mockResolvedValueOnce(ok(1));
    const temporizador = new TemporizadorFalso();
    const alCambiar = vi.fn();
    new FuenteDeEstadoPorConsulta(fetchFalso, 3000, temporizador).suscribir("s", alCambiar);

    await vaciar();
    temporizador.disparar();
    await vaciar();

    expect(alCambiar).toHaveBeenCalledOnce();
  });

  it("cancelar detiene las peticiones", async () => {
    const fetchFalso = vi.fn().mockResolvedValue(ok(1));
    const temporizador = new TemporizadorFalso();
    const cancelar = new FuenteDeEstadoPorConsulta(fetchFalso, 3000, temporizador).suscribir(
      "s",
      vi.fn(),
    );
    await vaciar();

    cancelar();
    temporizador.disparar();
    await vaciar();

    expect(fetchFalso).toHaveBeenCalledOnce();
    expect(temporizador.pendientes).toHaveLength(0);
  });

  it("cancelar con una petición en vuelo no entrega el resultado", async () => {
    let resolver!: (r: Response) => void;
    const fetchFalso = vi.fn().mockReturnValue(new Promise<Response>((r) => (resolver = r)));
    const alCambiar = vi.fn();
    const cancelar = new FuenteDeEstadoPorConsulta(
      fetchFalso,
      3000,
      new TemporizadorFalso(),
    ).suscribir("s", alCambiar);

    cancelar();
    resolver(ok(1));
    await vaciar();

    expect(alCambiar).not.toHaveBeenCalled();
  });

  it("no consulta mientras la pestaña está oculta", async () => {
    vi.stubGlobal("document", { visibilityState: "hidden" });
    const fetchFalso = vi.fn().mockResolvedValue(ok(1));
    const temporizador = new TemporizadorFalso();
    new FuenteDeEstadoPorConsulta(fetchFalso, 3000, temporizador).suscribir("s", vi.fn());
    await vaciar();
    expect(fetchFalso).not.toHaveBeenCalled();
    expect(temporizador.pendientes).toHaveLength(1);

    vi.stubGlobal("document", { visibilityState: "visible" });
    temporizador.disparar();
    await vaciar();

    expect(fetchFalso).toHaveBeenCalledOnce();
  });

  it("llama a fetch sin la instancia como this", async () => {
    const fetchFalso = vi.fn().mockResolvedValue(ok(1));
    const fuente = new FuenteDeEstadoPorConsulta(fetchFalso, 3000, new TemporizadorFalso());
    fuente.suscribir("s", vi.fn());
    await vaciar();

    expect(fetchFalso.mock.contexts[0]).not.toBe(fuente);
  });

  it("informa los fallos por alFallar y sigue reintentando", async () => {
    const error = new Error("red");
    const fetchFalso = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(new Response("x", { status: 500 }));
    const temporizador = new TemporizadorFalso();
    const alFallar = vi.fn();
    new FuenteDeEstadoPorConsulta(fetchFalso, 3000, temporizador, alFallar).suscribir("s", vi.fn());

    await vaciar();
    temporizador.disparar();
    await vaciar();

    expect(alFallar).toHaveBeenCalledTimes(2);
    expect(alFallar).toHaveBeenNthCalledWith(1, error);
    expect(temporizador.pendientes).toHaveLength(1);
  });

  it("informa por alFallar un 200 que no cumple el contrato y no notifica el cambio", async () => {
    const fetchFalso = vi.fn().mockResolvedValue(Response.json({ version: "no-es-un-numero" }));
    const temporizador = new TemporizadorFalso();
    const alFallar = vi.fn();
    const alCambiar = vi.fn();
    new FuenteDeEstadoPorConsulta(fetchFalso, 3000, temporizador, alFallar).suscribir(
      "s",
      alCambiar,
    );

    await vaciar();

    expect(alFallar).toHaveBeenCalledOnce();
    expect(alCambiar).not.toHaveBeenCalled();
    expect(temporizador.pendientes).toHaveLength(1);
  });
});
