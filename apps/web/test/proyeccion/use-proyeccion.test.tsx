// @vitest-environment jsdom
import type { EstadoDeSala } from "@kuorum/contracts";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FuenteDeEstado } from "@/tiempo-real/fuente-de-estado";
import { useProyeccion } from "@/vistas/proyeccion/use-proyeccion";
import { HORA, conLaPalabra, preguntaAbierta, preguntaConResultado, salaVacia } from "./estados";

class FuenteFalsa implements FuenteDeEstado {
  alCambiar: ((estado: EstadoDeSala) => void) | undefined;
  alNoExistir: (() => void) | undefined;
  alIntentar: ((conExito: boolean) => void) | undefined;
  codigo: string | undefined;
  canceladas = 0;
  suscribir(
    codigo: string,
    alCambiar: (estado: EstadoDeSala) => void,
    alNoExistir?: () => void,
    alIntentar?: (conExito: boolean) => void,
  ): () => void {
    this.codigo = codigo;
    this.alCambiar = alCambiar;
    this.alNoExistir = alNoExistir;
    this.alIntentar = alIntentar;
    return () => {
      this.canceladas++;
    };
  }
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useProyeccion", () => {
  it("empieza cargando y se suscribe al código", () => {
    const fuente = new FuenteFalsa();
    const { result } = renderHook(() => useProyeccion(fuente, "K7F2"));
    expect(result.current).toEqual({
      vista: "cargando",
      segundosRestantes: null,
      sinConexion: false,
    });
    expect(fuente.codigo).toBe("K7F2");
  });

  it("recorre las vistas según el estado que llega", () => {
    const fuente = new FuenteFalsa();
    const { result } = renderHook(() => useProyeccion(fuente, "K7F2"));
    const recibir = (estado: EstadoDeSala) => act(() => fuente.alCambiar?.(estado));

    recibir(salaVacia());
    expect(result.current.vista).toBe("esperando");

    recibir(salaVacia({ version: 2, pregunta: preguntaAbierta() }));
    expect(result.current.vista).toBe("votacion");
    expect(result.current.estado?.pregunta?.votosEmitidos).toBe(812);

    recibir(salaVacia({ version: 3, pregunta: preguntaConResultado() }));
    expect(result.current.vista).toBe("resultados");

    recibir(salaVacia({ version: 4, palabra: { conLaPalabra: conLaPalabra(), fila: [] } }));
    expect(result.current.vista).toBe("palabra");
  });

  it("un 404 deja la vista no-disponible", () => {
    const fuente = new FuenteFalsa();
    const { result } = renderHook(() => useProyeccion(fuente, "K7F2"));
    act(() => fuente.alNoExistir?.());
    expect(result.current.vista).toBe("no-disponible");
    expect(result.current.segundosRestantes).toBeNull();
  });

  it("cancela la suscripción al desmontar y al cambiar de código", () => {
    const fuente = new FuenteFalsa();
    const { rerender, unmount } = renderHook(({ c }) => useProyeccion(fuente, c), {
      initialProps: { c: "K7F2" },
    });
    rerender({ c: "ABCD" });
    expect(fuente.canceladas).toBe(1);
    expect(fuente.codigo).toBe("ABCD");
    unmount();
    expect(fuente.canceladas).toBe(2);
  });

  it("avisa sin conexión tras 3 fallos seguidos y lo quita al primer éxito", () => {
    const fuente = new FuenteFalsa();
    const { result } = renderHook(() => useProyeccion(fuente, "K7F2"));
    act(() => fuente.alCambiar?.(salaVacia()));
    const intentar = (ok: boolean) => act(() => fuente.alIntentar?.(ok));

    intentar(false);
    intentar(false);
    expect(result.current.sinConexion).toBe(false);
    intentar(false);
    expect(result.current.sinConexion).toBe(true);
    expect(result.current.vista).toBe("esperando");
    intentar(true);
    expect(result.current.sinConexion).toBe(false);
  });

  it("un éxito en medio reinicia la cuenta de fallos", () => {
    const fuente = new FuenteFalsa();
    const { result } = renderHook(() => useProyeccion(fuente, "K7F2"));
    const intentar = (ok: boolean) => act(() => fuente.alIntentar?.(ok));
    intentar(false);
    intentar(false);
    intentar(true);
    intentar(false);
    intentar(false);
    expect(result.current.sinConexion).toBe(false);
  });

  it("sala terminada da la vista terminada", () => {
    const fuente = new FuenteFalsa();
    const { result } = renderHook(() => useProyeccion(fuente, "K7F2"));
    const base = salaVacia();
    act(() => fuente.alCambiar?.({ ...base, sala: { ...base.sala, estado: "CERRADA" } }));
    expect(result.current.vista).toBe("terminada");
  });

  describe("cronómetro", () => {
    const base = Date.parse(HORA);

    it("cuenta desde la hora del servidor, no desde el reloj local", () => {
      const fuente = new FuenteFalsa();
      // El reloj local va 10 minutos adelantado respecto al servidor.
      let local = base + 600_000;
      const { result } = renderHook(() =>
        useProyeccion(fuente, "K7F2", { reloj: () => local, intervaloMs: 250 }),
      );
      // La intervención empezó hace 80 s según el servidor: quedan 100 de 180.
      act(() =>
        fuente.alCambiar?.(
          salaVacia({
            horaDelServidor: HORA,
            palabra: {
              conLaPalabra: conLaPalabra(new Date(base - 80_000).toISOString(), 180),
              fila: [],
            },
          }),
        ),
      );
      expect(result.current.segundosRestantes).toBe(100);

      local += 30_000;
      act(() => vi.advanceTimersByTime(250));
      expect(result.current.segundosRestantes).toBe(70);
    });

    it("redondea hacia arriba y no baja de cero", () => {
      const fuente = new FuenteFalsa();
      let local = base;
      const { result } = renderHook(() =>
        useProyeccion(fuente, "K7F2", { reloj: () => local, intervaloMs: 250 }),
      );
      act(() =>
        fuente.alCambiar?.(
          salaVacia({ palabra: { conLaPalabra: conLaPalabra(HORA, 180), fila: [] } }),
        ),
      );
      expect(result.current.segundosRestantes).toBe(180);

      local += 500;
      act(() => vi.advanceTimersByTime(250));
      expect(result.current.segundosRestantes).toBe(180);

      local += 1_000;
      act(() => vi.advanceTimersByTime(250));
      expect(result.current.segundosRestantes).toBe(179);

      local += 500_000;
      act(() => vi.advanceTimersByTime(250));
      expect(result.current.segundosRestantes).toBe(0);
    });

    it("recalcula el desfase con cada estado nuevo", () => {
      const fuente = new FuenteFalsa();
      let local = base;
      const { result } = renderHook(() =>
        useProyeccion(fuente, "K7F2", { reloj: () => local, intervaloMs: 250 }),
      );
      const palabra = { conLaPalabra: conLaPalabra(HORA, 180), fila: [] };
      act(() => fuente.alCambiar?.(salaVacia({ palabra })));
      expect(result.current.segundosRestantes).toBe(180);

      // El servidor dice que pasaron 60 s; el reloj local sólo avanzó 5.
      local += 5_000;
      act(() =>
        fuente.alCambiar?.(
          salaVacia({
            version: 2,
            palabra,
            horaDelServidor: new Date(base + 60_000).toISOString(),
          }),
        ),
      );
      expect(result.current.segundosRestantes).toBe(120);
    });

    it("fuera de la vista de palabra no hay segundos restantes", () => {
      const fuente = new FuenteFalsa();
      const { result } = renderHook(() => useProyeccion(fuente, "K7F2"));
      act(() => fuente.alCambiar?.(salaVacia({ pregunta: preguntaAbierta() })));
      expect(result.current.segundosRestantes).toBeNull();
    });
  });
});
