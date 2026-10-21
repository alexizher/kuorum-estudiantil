import { ErrorDeDominio, SesionNoEncontrada } from "@kuorum/domain";
import { describe, expect, it, vi } from "vitest";
import { respuestaDeError } from "../../src/http/respuesta-de-error";

describe("respuestaDeError", () => {
  it.each([
    ["SALA_NO_DISPONIBLE", 404],
    ["PREGUNTA_NO_ENCONTRADA", 404],
    ["YA_VOTO", 409],
    ["PREGUNTA_CERRADA", 409],
    ["OTRA_PREGUNTA_ABIERTA", 409],
    ["YA_EN_LA_FILA", 409],
    ["CIERRE_OCUPADO", 409],
    ["TRANSICION_INVALIDA", 409],
    ["SESION_NO_EN_CURSO", 409],
    ["SESION_NO_DISPONIBLE", 409],
    ["SESION_CON_VOTACION_ABIERTA", 409],
    ["PARTICIPANTE_AJENO", 403],
    ["NO_ES_TUYA", 403],
    ["OPCION_INVALIDA", 422],
    ["CODIGO_NO_EXISTE", 422],
  ])("%s da %i, sin caché", async (codigo, estado) => {
    const r = respuestaDeError(new ErrorDeDominio(codigo));
    expect(r.status).toBe(estado);
    expect(r.headers.get("Cache-Control")).toBe("no-store");
    expect((await r.json()).error).toBe(codigo);
  });

  it("SesionNoEncontrada da 404 SESION_NO_ENCONTRADA", async () => {
    const r = respuestaDeError(new SesionNoEncontrada("x"));
    expect(r.status).toBe(404);
    expect(await r.json()).toMatchObject({ error: "SESION_NO_ENCONTRADA" });
  });

  it("agrega mensaje en español a los códigos que muestra la interfaz", async () => {
    const cuerpo = async (c: string) =>
      (await respuestaDeError(new ErrorDeDominio(c)).json()).mensaje;
    expect(await cuerpo("YA_VOTO")).toBe("Ya votaste en esta pregunta.");
    expect(await cuerpo("PREGUNTA_CERRADA")).toBe("La votación ya se cerró.");
    expect(await cuerpo("SALA_NO_DISPONIBLE")).toBe("Esta sala no existe o ya terminó.");
    expect(await cuerpo("CODIGO_NO_EXISTE")).toBe("Ese código no es de esta sala.");
    expect(await cuerpo("SESION_CON_VOTACION_ABIERTA")).toBe(
      "Cierra la votación abierta antes de terminar la sesión.",
    );
    expect(await cuerpo("TRANSICION_INVALIDA")).toBeUndefined();
    const ocupado = await respuestaDeError(
      new ErrorDeDominio("CIERRE_OCUPADO", "Hay votos entrando"),
    ).json();
    expect(ocupado.mensaje).toBe("Hay votos entrando");
  });

  it("usa la caché pública corta solo para el 404 cuando se pide", () => {
    const corta = "public, max-age=0, s-maxage=1";
    expect(
      respuestaDeError(new ErrorDeDominio("SALA_NO_DISPONIBLE"), { cacheEn404: corta }).headers.get(
        "Cache-Control",
      ),
    ).toBe(corta);
    expect(
      respuestaDeError(new ErrorDeDominio("YA_VOTO"), { cacheEn404: corta }).headers.get(
        "Cache-Control",
      ),
    ).toBe("no-store");
  });

  it("500 genérico sin filtrar el mensaje y lo registra", async () => {
    const registro = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const r = respuestaDeError(new Error("conexión rota con secreto"));
    expect(r.status).toBe(500);
    expect(await r.json()).toEqual({ error: "ERROR_INTERNO" });
    expect(registro).toHaveBeenCalledOnce();
    registro.mockRestore();
  });
});
