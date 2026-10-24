import { describe, expect, it, vi } from "vitest";
import { ClienteDeSalaPorFetch, ErrorDeAccion } from "@/vistas/participante/cliente-de-sala";

function respuesta(estado: number, cuerpo?: unknown): Response {
  return estado === 204
    ? new Response(null, { status: 204 })
    : Response.json(cuerpo ?? {}, { status: estado });
}

function cliente(fetchFalso: typeof globalThis.fetch) {
  return new ClienteDeSalaPorFetch(fetchFalso);
}

describe("ClienteDeSalaPorFetch", () => {
  it("ingresar hace POST a /ingresar con el cuerpo y las cookies", async () => {
    const f = vi.fn(async () => respuesta(200, { ok: true }));
    await cliente(f).ingresar("K7F2", { tokenNavegador: "t" });
    expect(f).toHaveBeenCalledWith("/api/public/v1/salas/K7F2/ingresar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokenNavegador: "t" }),
      credentials: "same-origin",
    });
  });

  it("votar manda preguntaId y opcionId", async () => {
    const f = vi.fn(async () => respuesta(201, { votado: true }));
    await cliente(f).votar("K7F2", "p1", "o1");
    expect(f).toHaveBeenCalledWith(
      "/api/public/v1/salas/K7F2/votos",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ preguntaId: "p1", opcionId: "o1" }),
      }),
    );
  });

  it("pedirPalabra y presentarMocion devuelven el id de la solicitud", async () => {
    const f = vi.fn(async () => respuesta(201, { solicitudId: "s-7" }));
    expect(await cliente(f).pedirPalabra("K7F2", "Ana")).toBe("s-7");
    expect(await cliente(f).presentarMocion("K7F2", "Ana", "ORDEN")).toBe("s-7");
    expect(f).toHaveBeenLastCalledWith(
      "/api/public/v1/salas/K7F2/mociones",
      expect.objectContaining({ body: JSON.stringify({ nombreVisible: "Ana", tipo: "ORDEN" }) }),
    );
  });

  it("retirar hace DELETE y acepta 204", async () => {
    const f = vi.fn(async () => respuesta(204));
    await cliente(f).retirar("K7F2", "s 1");
    expect(f).toHaveBeenCalledWith("/api/public/v1/salas/K7F2/solicitudes/s%201", {
      method: "DELETE",
      credentials: "same-origin",
    });
  });

  it("un error de la API conserva estado, código y mensaje", async () => {
    const f = vi.fn(async () =>
      respuesta(409, { error: "YA_VOTO", mensaje: "Ya votaste en esta pregunta." }),
    );
    const error = await cliente(f)
      .votar("K7F2", "p1", "o1")
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorDeAccion);
    expect(error).toMatchObject({
      estado: 409,
      codigo: "YA_VOTO",
      message: "Ya votaste en esta pregunta.",
    });
  });

  it("sin mensaje de la API usa un texto en español según el código", async () => {
    const casos: [number, string, string][] = [
      [401, "SIN_INGRESO", "Tu ingreso a la sala venció. Escribe tu código otra vez."],
      [429, "DEMASIADAS_SOLICITUDES", "Demasiados intentos seguidos. Espera un momento."],
      [422, "OPCION_INVALIDA", "Esa opción ya no está disponible. Elige otra."],
      [
        422,
        "CODIGO_DE_ACCESO_INVALIDO",
        "El código tiene dos grupos de 4 caracteres, como ABCD-EFGH.",
      ],
      [500, "ERROR_INTERNO", "No se pudo completar. Inténtalo de nuevo."],
    ];
    for (const [estado, error, mensaje] of casos) {
      const f = vi.fn(async () => respuesta(estado, { error }));
      await expect(cliente(f).votar("K7F2", "p1", "o1")).rejects.toMatchObject({
        codigo: error,
        message: mensaje,
      });
    }
  });

  it("un fallo de red es SIN_CONEXION", async () => {
    const f = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(cliente(f).retirar("K7F2", "s1")).rejects.toMatchObject({
      estado: 0,
      codigo: "SIN_CONEXION",
      message: "No hay conexión. Revisa tu red e inténtalo de nuevo.",
    });
  });

  it("una respuesta que no es JSON sigue dando un error legible", async () => {
    const f = vi.fn(async () => new Response("<html>", { status: 502 }));
    await expect(cliente(f).votar("K7F2", "p1", "o1")).rejects.toMatchObject({
      estado: 502,
      message: "No se pudo completar. Inténtalo de nuevo.",
    });
  });
});
