import { describe, expect, it } from "vitest";
// @ts-expect-error script .mjs sin tipos
import { normalizarSslmode } from "../../tools/load/conexion.mjs";

const normalizar = normalizarSslmode as (url: string) => string;

describe("normalizarSslmode", () => {
  it.each(["require", "prefer", "verify-ca"])(
    "cambia sslmode=%s por verify-full, que es lo que pg ya hace, sin tocar lo demás",
    (modo) => {
      const url = `postgresql://u:p%40ss@ep-x.neon.tech/neondb?sslmode=${modo}&channel_binding=require`;
      expect(normalizar(url)).toBe(
        "postgresql://u:p%40ss@ep-x.neon.tech/neondb?sslmode=verify-full&channel_binding=require",
      );
    },
  );

  it("con uselibpqcompat=true no cambia nada: ahí require no verifica el certificado", () => {
    const url = "postgresql://u:p@ep-x.neon.tech/neondb?sslmode=require&uselibpqcompat=true";
    expect(normalizar(url)).toBe(url);
  });

  it("deja igual una URL sin sslmode o con otro modo", () => {
    const local = "postgresql://kuorum:kuorum@localhost:54329/kuorum";
    expect(normalizar(local)).toBe(local);
    expect(normalizar(`${local}?sslmode=disable`)).toBe(`${local}?sslmode=disable`);
    expect(normalizar(`${local}?sslmode=verify-full`)).toBe(`${local}?sslmode=verify-full`);
  });
});
