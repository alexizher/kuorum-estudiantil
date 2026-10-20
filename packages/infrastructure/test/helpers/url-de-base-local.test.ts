import { describe, expect, it } from "vitest";
import { exigirUrlLocal } from "./url-de-base-local.js";

describe("exigirUrlLocal", () => {
  it.each([
    "postgresql://kuorum:kuorum@localhost:54329/kuorum",
    "postgresql://kuorum:kuorum@127.0.0.1:5432/kuorum",
    "postgresql://kuorum:kuorum@[::1]:5432/kuorum",
  ])("deja pasar %s", (url) => {
    expect(exigirUrlLocal(url)).toBe(url);
  });

  it("falla con una URL de Neon", () => {
    const url = "postgresql://u:p@ep-cool-123.us-east-2.aws.neon.tech/db?sslmode=require";
    expect(() => exigirUrlLocal(url)).toThrow(/solo corren contra un Postgres local/);
  });
});
