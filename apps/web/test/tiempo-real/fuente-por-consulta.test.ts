import type { EstadoDeSala } from "@kuorum/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FuenteDeEstadoPorConsulta } from "@/tiempo-real/fuente-por-consulta";
import type { Temporizador } from "@/tiempo-real/fuente-de-estado";
import {
  INTERVALO_ACTIVO_MS,
  PoliticaAdaptativa,
  PoliticaFija,
} from "@/tiempo-real/intervalo-adaptativo";

function estado(version: number): EstadoDeSala {
  return {
    sala: {
      codigo: "K7F2",
      titulo: "Asamblea",
      estado: "EN_CURSO",
      modo: "SALA_ABIERTA",
      indicativa: false,
    },
    version,
    asistencia: null,
    pregunta: null,
    palabra: { conLaPalabra: null, fila: [] },
    horaDelServidor: "2026-10-19T12:00:00.000Z",
  };
}

function ok(version: number): Response {
  return Response.json(estado(version), { headers: { ETag: `W/"s-${version}"` } });
}

class TemporizadorFalso implements Temporizador {
  pendientes: Array<() => void> = [];
  esperas: number[] = [];
  cancelados = 0;
  programar(accion: () => void, ms: number): () => void {
    this.pendientes.push(accion);
    this.esperas.push(ms);
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

/** Documento mínimo con la visibilidad que lee la fuente y sus eventos. */
function pestana(visibilityState: DocumentVisibilityState) {
  const documento = Object.assign(new EventTarget(), { visibilityState });
  vi.stubGlobal("document", documento);
  return documento;
}

function mostrar(documento: ReturnType<typeof pestana>): void {
  documento.visibilityState = "visible";
  documento.dispatchEvent(new Event("visibilitychange"));
}

describe("FuenteDeEstadoPorConsulta", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("dos respuestas 200 con versiones 1 y 2 llaman dos veces a alCambiar", async () => {
    const fetchFalso = vi.fn().mockResolvedValueOnce(ok(1)).mockResolvedValueOnce(ok(2));
    const temporizador = new TemporizadorFalso();
    const alCambiar = vi.fn();
    new FuenteDeEstadoPorConsulta(fetchFalso, new PoliticaFija(3000), { temporizador }).suscribir(
      "K7F2",
      alCambiar,
    );

    await vaciar();
    temporizador.disparar();
    await vaciar();

    expect(alCambiar.mock.calls).toEqual([[estado(1)], [estado(2)]]);
    expect(fetchFalso.mock.calls[0]?.[0]).toBe("/api/public/v1/salas/K7F2/estado");
  });

  it("un 304 no llama a alCambiar y la segunda petición lleva If-None-Match", async () => {
    const fetchFalso = vi
      .fn()
      .mockResolvedValueOnce(ok(1))
      .mockResolvedValueOnce(new Response(null, { status: 304 }));
    const temporizador = new TemporizadorFalso();
    const alCambiar = vi.fn();
    new FuenteDeEstadoPorConsulta(fetchFalso, new PoliticaFija(3000), { temporizador }).suscribir(
      "K7F2",
      alCambiar,
    );

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
    new FuenteDeEstadoPorConsulta(fetchFalso, new PoliticaFija(3000), { temporizador }).suscribir(
      "K7F2",
      alCambiar,
    );

    await vaciar();
    temporizador.disparar();
    await vaciar();

    expect(alCambiar.mock.calls).toEqual([[estado(2)]]);
  });

  it("sigue consultando tras un error de red", async () => {
    const fetchFalso = vi.fn().mockRejectedValueOnce(new Error("red")).mockResolvedValueOnce(ok(1));
    const temporizador = new TemporizadorFalso();
    const alCambiar = vi.fn();
    new FuenteDeEstadoPorConsulta(fetchFalso, new PoliticaFija(3000), { temporizador }).suscribir(
      "K7F2",
      alCambiar,
    );

    await vaciar();
    temporizador.disparar();
    await vaciar();

    expect(alCambiar).toHaveBeenCalledOnce();
  });

  it("cancelar detiene las peticiones", async () => {
    const fetchFalso = vi.fn().mockResolvedValue(ok(1));
    const temporizador = new TemporizadorFalso();
    const cancelar = new FuenteDeEstadoPorConsulta(fetchFalso, new PoliticaFija(3000), {
      temporizador,
    }).suscribir("K7F2", vi.fn());
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
    const cancelar = new FuenteDeEstadoPorConsulta(fetchFalso, new PoliticaFija(3000), {
      temporizador: new TemporizadorFalso(),
    }).suscribir("K7F2", alCambiar);

    cancelar();
    resolver(ok(1));
    await vaciar();

    expect(alCambiar).not.toHaveBeenCalled();
  });

  it("no consulta mientras la pestaña está oculta", async () => {
    const documento = pestana("hidden");
    const fetchFalso = vi.fn().mockResolvedValue(ok(1));
    const temporizador = new TemporizadorFalso();
    new FuenteDeEstadoPorConsulta(fetchFalso, new PoliticaFija(3000), { temporizador }).suscribir(
      "K7F2",
      vi.fn(),
    );
    await vaciar();
    expect(fetchFalso).not.toHaveBeenCalled();
    expect(temporizador.pendientes).toHaveLength(1);

    documento.visibilityState = "visible";
    temporizador.disparar();
    await vaciar();

    expect(fetchFalso).toHaveBeenCalledOnce();
  });

  it("al volver a la pestaña consulta de inmediato sin esperar el turno", async () => {
    const documento = pestana("hidden");
    const fetchFalso = vi.fn().mockResolvedValue(new Response(null, { status: 304 }));
    const temporizador = new TemporizadorFalso();
    new FuenteDeEstadoPorConsulta(fetchFalso, new PoliticaAdaptativa(), { temporizador }).suscribir(
      "K7F2",
      vi.fn(),
    );
    await vaciar();
    expect(fetchFalso).not.toHaveBeenCalled();

    mostrar(documento);
    await vaciar();

    expect(fetchFalso).toHaveBeenCalledOnce();
    // la espera de 12 s se canceló y queda una sola, nueva
    expect(temporizador.cancelados).toBe(1);
    expect(temporizador.pendientes).toHaveLength(1);
  });

  it("cancelar deja de escuchar la visibilidad de la pestaña", async () => {
    const documento = pestana("hidden");
    const agregar = vi.spyOn(documento, "addEventListener");
    const quitar = vi.spyOn(documento, "removeEventListener");
    const fetchFalso = vi.fn().mockResolvedValue(ok(1));
    const cancelar = new FuenteDeEstadoPorConsulta(fetchFalso, new PoliticaFija(3000), {
      temporizador: new TemporizadorFalso(),
    }).suscribir("K7F2", vi.fn());
    await vaciar();

    cancelar();
    mostrar(documento);
    await vaciar();

    expect(quitar).toHaveBeenCalledWith("visibilitychange", agregar.mock.calls[0]?.[1]);
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("con la pestaña oculta no consulta aunque haya una votación abierta y al volver sigue al ritmo activo", async () => {
    const documento = pestana("hidden");
    const fetchFalso = vi.fn().mockResolvedValue(new Response(null, { status: 304 }));
    const temporizador = new TemporizadorFalso();
    new FuenteDeEstadoPorConsulta(fetchFalso, new PoliticaAdaptativa(), {
      temporizador,
      contexto: () => ({ votacionAbierta: true, enFilaDePalabra: false }),
    }).suscribir("K7F2", vi.fn());
    await vaciar();
    temporizador.disparar();
    await vaciar();

    expect(fetchFalso).not.toHaveBeenCalled();
    expect(temporizador.esperas).toEqual([INTERVALO_ACTIVO_MS, INTERVALO_ACTIVO_MS]);

    documento.visibilityState = "visible";
    temporizador.disparar();
    await vaciar();

    expect(fetchFalso).toHaveBeenCalledOnce();
    expect(temporizador.esperas).toEqual([
      INTERVALO_ACTIVO_MS,
      INTERVALO_ACTIVO_MS,
      INTERVALO_ACTIVO_MS,
    ]);
  });

  it("reprograma con el intervalo que da la política según el contexto", async () => {
    const fetchFalso = vi.fn().mockResolvedValue(new Response(null, { status: 304 }));
    const esperas: number[] = [];
    let accion: (() => void) | undefined;
    const temporizador: Temporizador = {
      programar(a, ms) {
        esperas.push(ms);
        accion = a;
        return () => {};
      },
    };
    let contexto = { votacionAbierta: false, enFilaDePalabra: false };
    new FuenteDeEstadoPorConsulta(fetchFalso, new PoliticaAdaptativa(), {
      temporizador,
      contexto: () => contexto,
    }).suscribir("K7F2", vi.fn());
    await vaciar();
    contexto = { votacionAbierta: true, enFilaDePalabra: false };
    accion?.();
    await vaciar();

    expect(esperas).toEqual([12_000, 3000]);
  });

  it("llama a fetch sin la instancia como this", async () => {
    const fetchFalso = vi.fn().mockResolvedValue(ok(1));
    const fuente = new FuenteDeEstadoPorConsulta(fetchFalso, new PoliticaFija(3000), {
      temporizador: new TemporizadorFalso(),
    });
    fuente.suscribir("K7F2", vi.fn());
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
    new FuenteDeEstadoPorConsulta(fetchFalso, new PoliticaFija(3000), {
      temporizador,
      alFallar,
    }).suscribir("K7F2", vi.fn());

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
    new FuenteDeEstadoPorConsulta(fetchFalso, new PoliticaFija(3000), {
      temporizador,
      alFallar,
    }).suscribir("K7F2", alCambiar);

    await vaciar();

    expect(alFallar).toHaveBeenCalledOnce();
    expect(alCambiar).not.toHaveBeenCalled();
    expect(temporizador.pendientes).toHaveLength(1);
  });

  it("un 404 avisa que la sala no existe y deja de consultar", async () => {
    const fetchFalso = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
    const temporizador = new TemporizadorFalso();
    const alNoExistir = vi.fn();
    const alFallar = vi.fn();
    new FuenteDeEstadoPorConsulta(fetchFalso, new PoliticaFija(3000), {
      temporizador,
      alFallar,
    }).suscribir("K7F2", vi.fn(), alNoExistir);

    await vaciar();

    expect(alNoExistir).toHaveBeenCalledOnce();
    expect(alFallar).not.toHaveBeenCalled();
    expect(temporizador.pendientes).toHaveLength(0);
    expect(fetchFalso).toHaveBeenCalledOnce();
  });

  it("codifica el código en la URL", async () => {
    const fetchFalso = vi.fn().mockResolvedValue(new Response(null, { status: 304 }));
    new FuenteDeEstadoPorConsulta(fetchFalso, new PoliticaFija(3000), {
      temporizador: new TemporizadorFalso(),
    }).suscribir("a/b", vi.fn());
    await vaciar();
    expect(fetchFalso.mock.calls[0]?.[0]).toBe("/api/public/v1/salas/a%2Fb/estado");
  });

  it("informa por alIntentar cada intento: error false, 200 y 304 true", async () => {
    const fetchFalso = vi
      .fn()
      .mockRejectedValueOnce(new Error("red"))
      .mockResolvedValueOnce(ok(1))
      .mockResolvedValueOnce(new Response(null, { status: 304 }));
    const temporizador = new TemporizadorFalso();
    const alIntentar = vi.fn();
    new FuenteDeEstadoPorConsulta(fetchFalso, new PoliticaFija(3000), { temporizador }).suscribir(
      "K7F2",
      vi.fn(),
      undefined,
      alIntentar,
    );
    await vaciar();
    temporizador.disparar();
    await vaciar();
    temporizador.disparar();
    await vaciar();
    expect(alIntentar.mock.calls).toEqual([[false], [true], [true]]);
  });

  it("reprogramar cambia la espera pendiente con el contexto de ahora", async () => {
    const programadas: number[] = [];
    const temporizador: Temporizador = {
      programar(_accion, ms) {
        programadas.push(ms);
        return () => undefined;
      },
    };
    let activo = false;
    const fuente = new FuenteDeEstadoPorConsulta(
      vi.fn().mockResolvedValue(ok(1)),
      new PoliticaAdaptativa(),
      {
        temporizador,
        contexto: () => ({ votacionAbierta: activo, enFilaDePalabra: false }),
      },
    );
    const cancelar = fuente.suscribir("K7F2", vi.fn());
    await vaciar();
    expect(programadas).toEqual([12_000]);
    activo = true;
    fuente.reprogramar();
    expect(programadas).toEqual([12_000, 3000]);
    cancelar();
    fuente.reprogramar();
    expect(programadas).toEqual([12_000, 3000]);
  });

  it("refrescar consulta ya, sin If-None-Match y saltándose la caché, y sigue el ciclo", async () => {
    const fetchFalso = vi
      .fn()
      .mockResolvedValueOnce(ok(1))
      .mockResolvedValueOnce(ok(2))
      .mockResolvedValueOnce(ok(3));
    const temporizador = new TemporizadorFalso();
    const alCambiar = vi.fn();
    const fuente = new FuenteDeEstadoPorConsulta(fetchFalso, new PoliticaFija(3000), {
      temporizador,
    });
    fuente.suscribir("K7F2", alCambiar);
    await vaciar();

    fuente.refrescar();
    await vaciar();

    expect(alCambiar.mock.calls).toEqual([[estado(1)], [estado(2)]]);
    const [url, opciones] = fetchFalso.mock.calls[1] as [string, RequestInit];
    expect(url).toMatch(/^\/api\/public\/v1\/salas\/K7F2\/estado\?r=\d+$/);
    expect(opciones.headers).toEqual({});
    // la espera anterior se canceló y hay exactamente una nueva
    expect(temporizador.pendientes).toHaveLength(1);
    temporizador.disparar();
    await vaciar();
    expect(alCambiar).toHaveBeenCalledTimes(3);
  });

  it("refrescar durante una consulta en vuelo repite al terminar y no deja dos ciclos", async () => {
    let resolver!: (r: Response) => void;
    const fetchFalso = vi
      .fn()
      .mockImplementationOnce(() => new Promise<Response>((r) => (resolver = r)))
      .mockResolvedValueOnce(ok(2));
    const temporizador = new TemporizadorFalso();
    const fuente = new FuenteDeEstadoPorConsulta(fetchFalso, new PoliticaFija(3000), {
      temporizador,
    });
    fuente.suscribir("K7F2", vi.fn());

    fuente.refrescar();
    expect(fetchFalso).toHaveBeenCalledTimes(1);
    resolver(ok(1));
    await vaciar();

    expect(fetchFalso).toHaveBeenCalledTimes(2);
    expect(temporizador.pendientes).toHaveLength(1);
  });

  it("refrescar tras cancelar la suscripción no consulta", async () => {
    const fetchFalso = vi.fn().mockResolvedValue(ok(1));
    const fuente = new FuenteDeEstadoPorConsulta(fetchFalso, new PoliticaFija(3000), {
      temporizador: new TemporizadorFalso(),
    });
    const cancelar = fuente.suscribir("K7F2", vi.fn());
    await vaciar();
    cancelar();
    fuente.refrescar();
    await vaciar();
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });
});
