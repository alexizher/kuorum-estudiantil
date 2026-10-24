import { describe, expect, it } from "vitest";
import { urlDePrisma } from "../../src/prisma/url-de-prisma.js";

const comando = (...resto: string[]) => ["node", "prisma", ...resto];

describe("urlDePrisma", () => {
  it("prefiere DATABASE_URL_UNPOOLED para migrar", () => {
    const url = urlDePrisma(
      { DATABASE_URL_UNPOOLED: "postgresql://directa", DATABASE_URL: "postgresql://pooler" },
      comando("migrate", "deploy"),
    );
    expect(url).toBe("postgresql://directa");
  });

  it("usa DATABASE_URL si no hay URL directa", () => {
    const url = urlDePrisma({ DATABASE_URL: "postgresql://pooler" }, comando("migrate", "deploy"));
    expect(url).toBe("postgresql://pooler");
  });

  it("generate no necesita URL", () => {
    expect(urlDePrisma({}, comando("generate"))).toBeUndefined();
  });

  it.each([["migrate", "deploy"], ["migrate", "dev"], ["db", "push"], ["studio"]])(
    "%s %s sin URL falla con un mensaje que nombra las dos variables",
    (...resto) => {
      expect(() => urlDePrisma({}, comando(...resto))).toThrow(
        /DATABASE_URL_UNPOOLED.*DATABASE_URL/s,
      );
    },
  );

  it("trata una variable vacía como ausente", () => {
    expect(() =>
      urlDePrisma({ DATABASE_URL_UNPOOLED: "", DATABASE_URL: "" }, comando("migrate", "deploy")),
    ).toThrow(/no hay URL de la base/);
  });

  it("una URL directa vacía cae a DATABASE_URL", () => {
    const url = urlDePrisma(
      { DATABASE_URL_UNPOOLED: "", DATABASE_URL: "postgresql://pooler" },
      comando("migrate", "deploy"),
    );
    expect(url).toBe("postgresql://pooler");
  });
});
