import { describe, expect, it } from "vitest";
import { origenesConfiablesDesdeEntorno, urlBaseDesdeEntorno } from "../../src/auth/crear-auth";

describe("origenesConfiablesDesdeEntorno", () => {
  it("en una vista previa acepta también la URL de la rama, con esquema", () => {
    expect(
      origenesConfiablesDesdeEntorno({
        VERCEL_ENV: "preview",
        VERCEL_URL: "kuorum-abc123.vercel.app",
        VERCEL_BRANCH_URL: "kuorum-git-rama-equipo.vercel.app",
      }),
    ).toEqual(["https://kuorum-git-rama-equipo.vercel.app"]);
  });

  it("en una vista previa sin VERCEL_BRANCH_URL no agrega nada", () => {
    expect(
      origenesConfiablesDesdeEntorno({ VERCEL_ENV: "preview", VERCEL_BRANCH_URL: "" }),
    ).toEqual([]);
  });

  it("en producción no agrega la URL de la rama", () => {
    expect(
      origenesConfiablesDesdeEntorno({
        VERCEL_ENV: "production",
        VERCEL_BRANCH_URL: "kuorum-git-main-equipo.vercel.app",
      }),
    ).toEqual([]);
  });

  it("fuera de Vercel no agrega nada", () => {
    expect(origenesConfiablesDesdeEntorno({})).toEqual([]);
  });
});

describe("urlBaseDesdeEntorno", () => {
  it("prefiere BETTER_AUTH_URL cuando está definida", () => {
    expect(
      urlBaseDesdeEntorno({
        BETTER_AUTH_URL: "https://votos.ejemplo.edu",
        VERCEL_ENV: "preview",
        VERCEL_URL: "rama-abc.vercel.app",
        VERCEL_PROJECT_PRODUCTION_URL: "kuorum.vercel.app",
      }),
    ).toBe("https://votos.ejemplo.edu");
  });

  it("en producción usa el dominio de producción con esquema", () => {
    expect(
      urlBaseDesdeEntorno({
        VERCEL_ENV: "production",
        VERCEL_URL: "kuorum-xyz.vercel.app",
        VERCEL_PROJECT_PRODUCTION_URL: "kuorum.vercel.app",
      }),
    ).toBe("https://kuorum.vercel.app");
  });

  it("en una vista previa usa VERCEL_URL y le agrega el esquema que no trae", () => {
    expect(
      urlBaseDesdeEntorno({
        VERCEL_ENV: "preview",
        VERCEL_URL: "kuorum-git-rama-equipo.vercel.app",
        VERCEL_PROJECT_PRODUCTION_URL: "kuorum.vercel.app",
      }),
    ).toBe("https://kuorum-git-rama-equipo.vercel.app");
  });

  it("en una vista previa sin VERCEL_URL no cae en el dominio de producción", () => {
    expect(
      urlBaseDesdeEntorno({
        VERCEL_ENV: "preview",
        VERCEL_PROJECT_PRODUCTION_URL: "kuorum.vercel.app",
      }),
    ).toBeUndefined();
  });

  it("no duplica el esquema si la variable ya lo trae", () => {
    expect(
      urlBaseDesdeEntorno({ VERCEL_ENV: "preview", VERCEL_URL: "https://rama.vercel.app" }),
    ).toBe("https://rama.vercel.app");
  });

  it("fuera de Vercel y sin BETTER_AUTH_URL deja que Better Auth tome el origen", () => {
    expect(urlBaseDesdeEntorno({})).toBeUndefined();
    expect(urlBaseDesdeEntorno({ BETTER_AUTH_URL: "" })).toBeUndefined();
  });
});
