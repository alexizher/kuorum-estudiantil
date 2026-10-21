// @vitest-environment jsdom
import type { EstadoDeSala } from "@kuorum/contracts";
import { TemaProvider } from "@kuorum/ui";
import { act, cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ParticipanteEnVivo } from "../../src/vistas/participante/participante-en-vivo";
import { preguntaAbierta, salaVacia } from "../proyeccion/estados";
import { AlmacenEnMemoria } from "./falsos";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.history.replaceState(null, "", "/");
});

interface Servidor {
  estado: EstadoDeSala;
  ingresar: (cuerpo: unknown) => Response;
  llamadas: { url: string; metodo: string; cuerpo: unknown }[];
  fetch: typeof globalThis.fetch;
  consultasDeEstado: () => number;
}

function servidor(estado: EstadoDeSala): Servidor {
  const s: Servidor = {
    estado,
    ingresar: () => Response.json({ ok: true }),
    llamadas: [],
    consultasDeEstado: () => s.llamadas.filter((l) => l.url.endsWith("/estado")).length,
    fetch: async (entrada, opciones) => {
      const url = String(entrada);
      const metodo = opciones?.method ?? "GET";
      const cuerpo =
        typeof opciones?.body === "string" ? (JSON.parse(opciones.body) as unknown) : null;
      s.llamadas.push({ url, metodo, cuerpo });
      if (url.endsWith("/estado"))
        return Response.json(s.estado, { headers: { ETag: `"${s.estado.version}"` } });
      if (url.endsWith("/ingresar")) return s.ingresar(cuerpo);
      if (url.endsWith("/votos")) return Response.json({ votado: true }, { status: 201 });
      return Response.json({ error: "NO_ESPERADA" }, { status: 500 });
    },
  };
  return s;
}

function pintar(s: Servidor, almacen = new AlmacenEnMemoria(), codigoInicial?: string) {
  return render(
    <TemaProvider>
      <ParticipanteEnVivo
        codigo="K7F2"
        {...(codigoInicial ? { codigoInicial } : {})}
        dependencias={{ fetch: s.fetch, almacen }}
      />
    </TemaProvider>,
  );
}

describe("ParticipanteEnVivo", () => {
  beforeEach(() => window.history.replaceState(null, "", "/"));

  it("sala abierta: entra sola, ve la votación, vota y queda la confirmación", async () => {
    const s = servidor(salaVacia({ pregunta: preguntaAbierta() }));
    const almacen = new AlmacenEnMemoria();
    pintar(s, almacen);
    await screen.findByRole("heading", { name: /¿Aprueba la asamblea/ });
    expect(s.llamadas.find((l) => l.url.endsWith("/ingresar"))?.cuerpo).toEqual({
      tokenNavegador: almacen.leer("kuorum-token-K7F2"),
    });
    await userEvent.click(screen.getByRole("radio", { name: "Sí" }));
    await userEvent.click(screen.getByRole("button", { name: "Votar" }));
    await screen.findByRole("heading", { name: "Tu voto quedó registrado" });
    expect(s.llamadas.find((l) => l.url.endsWith("/votos"))?.cuerpo).toEqual({
      preguntaId: "p1",
      opcionId: "o0",
    });
    expect(almacen.leer("kuorum-votadas-K7F2")).toBe('["p1"]');
  });

  it("con códigos: pide el código y entra con él", async () => {
    const s = servidor(salaVacia());
    s.ingresar = (cuerpo) =>
      (cuerpo as { codigo?: string }).codigo === "ABCD-EFGH"
        ? Response.json({ ok: true })
        : Response.json({ error: "MODO_REQUIERE_CODIGO" }, { status: 422 });
    pintar(s);
    await userEvent.type(await screen.findByLabelText("Tu código de acceso"), "abcd-efgh");
    await userEvent.click(screen.getByRole("button", { name: "Entrar a la sala" }));
    await screen.findByText("Todavía no hay una votación abierta.");
  });

  it("?c= entra solo y saca el código de la barra de direcciones", async () => {
    window.history.replaceState(null, "", "/s/K7F2?c=ABCD-EFGH");
    const s = servidor(salaVacia());
    pintar(s, new AlmacenEnMemoria(), "ABCD-EFGH");
    await screen.findByText("Todavía no hay una votación abierta.");
    expect(s.llamadas.find((l) => l.url.endsWith("/ingresar"))?.cuerpo).toEqual({
      codigo: "ABCD-EFGH",
    });
    expect(window.location.search).toBe("");
  });

  it("una cookie vencida (401) devuelve a pedir el código", async () => {
    const s = servidor(salaVacia({ pregunta: preguntaAbierta() }));
    const base = s.fetch;
    s.fetch = async (entrada, opciones) =>
      String(entrada).endsWith("/votos")
        ? Response.json({ error: "SIN_INGRESO" }, { status: 401 })
        : base(entrada, opciones);
    pintar(s);
    await screen.findByRole("heading", { name: /¿Aprueba la asamblea/ });
    s.ingresar = () => Response.json({ error: "MODO_REQUIERE_CODIGO" }, { status: 422 });
    await userEvent.click(screen.getByRole("radio", { name: "Sí" }));
    await userEvent.click(screen.getByRole("button", { name: "Votar" }));
    await screen.findByLabelText("Tu código de acceso");
  });

  it("sala inexistente (404 del estado)", async () => {
    const s = servidor(salaVacia());
    s.fetch = async (entrada) =>
      String(entrada).endsWith("/estado")
        ? Response.json({ error: "SALA_NO_DISPONIBLE" }, { status: 404 })
        : Response.json({ ok: true });
    pintar(s);
    await screen.findByRole("heading", { name: "Esta sala no existe o ya terminó." });
  });

  describe("intervalo de consulta", () => {
    async function pasar(ms: number) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
      });
    }

    it("en reposo consulta cada 12 s", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: false });
      const s = servidor(salaVacia());
      pintar(s);
      await pasar(0);
      expect(s.consultasDeEstado()).toBe(1);
      await pasar(11_000);
      expect(s.consultasDeEstado()).toBe(1);
      await pasar(1_000);
      expect(s.consultasDeEstado()).toBe(2);
    });

    it("con una votación abierta sin votar consulta cada 3 s", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: false });
      const s = servidor(salaVacia({ pregunta: preguntaAbierta() }));
      pintar(s);
      await pasar(0);
      // El contexto se actualiza al llegar el primer estado: ya no espera 12 s.
      const antes = s.consultasDeEstado();
      await pasar(3_000);
      expect(s.consultasDeEstado()).toBe(antes + 1);
      await pasar(3_000);
      expect(s.consultasDeEstado()).toBe(antes + 2);
    });
  });
});
