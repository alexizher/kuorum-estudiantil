import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createPrismaClient, crearAdaptadorDeAutenticacion } from "@kuorum/infrastructure";
import { crearAuth, type Autenticacion } from "../src/auth/crear-auth";
import { actualizarCuentaDeMesa, crearCuentaDeMesa } from "../src/auth/crear-cuenta";
import { contenedor } from "../src/composicion";
import { exigirMesa } from "../src/http/exigir-mesa";

vi.mock("../src/composicion", () => ({ contenedor: vi.fn() }));

const URL_BASE = "http://localhost:3000";
const URL_DE_PRUEBAS =
  process.env["DATABASE_URL"] ?? "postgresql://kuorum:kuorum@localhost:54329/kuorum";
const CORREO = "mesa@ejemplo.test";
const CONTRASENA = "una-contrasena-larga-1";

const prisma = createPrismaClient(URL_DE_PRUEBAS);
let auth: Autenticacion;

afterAll(() => prisma.$disconnect());

function ingresar(correo: string, contrasena: string, ip = "203.0.113.7"): Promise<Response> {
  return auth.handler(
    new Request(`${URL_BASE}/api/auth/sign-in/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: URL_BASE,
        "x-forwarded-for": ip,
      },
      body: JSON.stringify({ email: correo, password: contrasena }),
    }),
  );
}

describe("ingreso de la mesa (Postgres local)", () => {
  beforeAll(() => {
    if (!["localhost", "127.0.0.1"].includes(new URL(URL_DE_PRUEBAS).hostname)) {
      throw new Error("Las pruebas de integración solo corren contra Postgres local.");
    }
    auth = crearAuth({
      adaptador: crearAdaptadorDeAutenticacion(prisma),
      secreto: "secreto-de-prueba-de-al-menos-32-caracteres",
      urlBase: URL_BASE,
    });
    vi.mocked(contenedor).mockReturnValue({ autenticacion: () => auth } as unknown as ReturnType<
      typeof contenedor
    >);
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe("DELETE FROM auth_users");
    await prisma.$executeRawUnsafe("DELETE FROM auth_rate_limits");
    await crearCuentaDeMesa(auth, {
      correo: CORREO,
      nombre: "Mesa",
      contrasena: CONTRASENA,
      rol: "MESA",
    });
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe("DELETE FROM auth_rate_limits");
    await prisma.$executeRawUnsafe("DELETE FROM auth_users");
  });

  it("login correcto abre sesión con cookie httpOnly", async () => {
    const respuesta = await ingresar(CORREO, CONTRASENA);
    expect(respuesta.status).toBe(200);
    const cookie = respuesta.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/session_token=/);
    expect(cookie).toMatch(/HttpOnly/i);
  });

  it("login con contraseña o correo incorrectos da 401", async () => {
    expect((await ingresar(CORREO, "otra-contrasena-larga")).status).toBe(401);
    expect((await ingresar("nadie@ejemplo.test", CONTRASENA)).status).toBe(401);
  });

  it("el sexto intento fallido en un minuto desde la misma IP da 429", async () => {
    const estados: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      estados.push((await ingresar(CORREO, "incorrecta-larga-1", "198.51.100.9")).status);
    }
    expect(estados.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(estados[5]).toBe(429);
    // Otra IP no queda bloqueada.
    expect((await ingresar(CORREO, CONTRASENA, "198.51.100.10")).status).toBe(200);
  });

  it("en production la cookie de sesión lleva Secure", async () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      const segura = crearAuth({
        adaptador: crearAdaptadorDeAutenticacion(prisma),
        secreto: "secreto-de-prueba-de-al-menos-32-caracteres",
        urlBase: URL_BASE,
      });
      const respuesta = await segura.handler(
        new Request(`${URL_BASE}/api/auth/sign-in/email`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: URL_BASE,
            "x-forwarded-for": "192.0.2.50",
          },
          body: JSON.stringify({ email: CORREO, password: CONTRASENA }),
        }),
      );
      expect(respuesta.status).toBe(200);
      expect(respuesta.headers.get("set-cookie") ?? "").toMatch(/Secure/i);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("el registro público está desactivado", async () => {
    const respuesta = await auth.handler(
      new Request(`${URL_BASE}/api/auth/sign-up/email`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: URL_BASE },
        body: JSON.stringify({ email: "intruso@ejemplo.test", name: "X", password: CONTRASENA }),
      }),
    );
    expect(respuesta.status).toBeGreaterThanOrEqual(400);
    const filas = await prisma.$queryRawUnsafe<unknown[]>(
      "SELECT 1 FROM auth_users WHERE email = 'intruso@ejemplo.test'",
    );
    expect(filas).toHaveLength(0);
  });

  it("crear una cuenta con un correo repetido falla", async () => {
    await expect(
      crearCuentaDeMesa(auth, {
        correo: CORREO,
        nombre: "Otra",
        contrasena: CONTRASENA,
        rol: "MESA",
      }),
    ).rejects.toThrow(/ya existe/i);
  });

  it("exigirMesa devuelve el actor con la cookie de sesión y 401 sin ella", async () => {
    const cookie = (await ingresar(CORREO, CONTRASENA)).headers.get("set-cookie") ?? "";
    const solicitud = new Request(`${URL_BASE}/api/mesa/x`, {
      headers: { cookie: cookie.split(";")[0] ?? "" },
    });
    const actor = await exigirMesa(solicitud);
    expect(actor).toEqual({
      id: expect.any(String),
      correo: CORREO,
      nombre: "Mesa",
      rol: "MESA",
    });

    const sinSesion = await exigirMesa(new Request(`${URL_BASE}/api/mesa/x`));
    expect(sinSesion).toBeInstanceOf(Response);
    expect((sinSesion as Response).status).toBe(401);
  });

  it("la sesión no guarda la IP", async () => {
    await ingresar(CORREO, CONTRASENA);
    const sesiones = await prisma.$queryRawUnsafe<{ ipAddress: string | null }[]>(
      'SELECT "ipAddress" FROM auth_sessions',
    );
    expect(sesiones.length).toBeGreaterThan(0);
    expect(sesiones.every((s) => !s.ipAddress)).toBe(true);
  });
});

const CORREO_DEMO = "demo@ejemplo.test";
const CORREO_SUPER = "jefe@ejemplo.test";

async function conCookie(correo: string): Promise<string> {
  const respuesta = await ingresar(
    correo,
    CONTRASENA,
    `203.0.113.${Math.floor(Math.random() * 200)}`,
  );
  expect(respuesta.status).toBe(200);
  return (respuesta.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
}

function llamarConCookie(ruta: string, cookie: string, cuerpo: unknown): Promise<Response> {
  return auth.handler(
    new Request(`${URL_BASE}/api/auth${ruta}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: URL_BASE, cookie },
      body: JSON.stringify(cuerpo),
    }),
  );
}

async function rolEnLaBase(correo: string): Promise<string | undefined> {
  const filas = await prisma.$queryRawUnsafe<{ rol: string }[]>(
    "SELECT rol::text AS rol FROM auth_users WHERE email = $1",
    correo,
  );
  return filas[0]?.rol;
}

describe("roles de la mesa (Postgres local)", () => {
  beforeAll(() => {
    auth = crearAuth({
      adaptador: crearAdaptadorDeAutenticacion(prisma),
      secreto: "secreto-de-prueba-de-al-menos-32-caracteres",
      urlBase: URL_BASE,
    });
    vi.mocked(contenedor).mockReturnValue({ autenticacion: () => auth } as unknown as ReturnType<
      typeof contenedor
    >);
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe("DELETE FROM auth_users");
    await prisma.$executeRawUnsafe("DELETE FROM auth_rate_limits");
    await crearCuentaDeMesa(auth, {
      correo: CORREO_DEMO,
      nombre: "Demo",
      contrasena: CONTRASENA,
      rol: "DEMO",
    });
    await crearCuentaDeMesa(auth, {
      correo: CORREO_SUPER,
      nombre: "Jefe",
      contrasena: CONTRASENA,
      rol: "SUPERADMIN",
    });
    await crearCuentaDeMesa(auth, {
      correo: CORREO,
      nombre: "Mesa",
      contrasena: CONTRASENA,
      rol: "MESA",
    });
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe("DELETE FROM auth_rate_limits");
    await prisma.$executeRawUnsafe("DELETE FROM auth_users");
  });

  it("cada cuenta queda con el rol con que se creó y exigirMesa lo devuelve", async () => {
    expect(await rolEnLaBase(CORREO_DEMO)).toBe("DEMO");
    expect(await rolEnLaBase(CORREO_SUPER)).toBe("SUPERADMIN");
    expect(await rolEnLaBase(CORREO)).toBe("MESA");
    for (const [correo, rol] of [
      [CORREO_DEMO, "DEMO"],
      [CORREO_SUPER, "SUPERADMIN"],
      [CORREO, "MESA"],
    ] as const) {
      const cookie = await conCookie(correo);
      const actor = await exigirMesa(
        new Request(`${URL_BASE}/api/mesa/x`, { headers: { cookie } }),
      );
      expect(actor).toMatchObject({ correo, rol });
    }
  });

  it("el cliente no puede cambiar su propio rol por update-user", async () => {
    const cookie = await conCookie(CORREO);
    const respuesta = await llamarConCookie("/update-user", cookie, {
      name: "Mesa",
      rol: "SUPERADMIN",
    });
    expect(respuesta.status).toBe(400);
    expect(await rolEnLaBase(CORREO)).toBe("MESA");
  });

  it("el registro tampoco acepta rol: está desactivado y no crea nada", async () => {
    const respuesta = await auth.handler(
      new Request(`${URL_BASE}/api/auth/sign-up/email`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: URL_BASE },
        body: JSON.stringify({
          email: "intruso@ejemplo.test",
          name: "X",
          password: CONTRASENA,
          rol: "SUPERADMIN",
        }),
      }),
    );
    expect(respuesta.status).toBeGreaterThanOrEqual(400);
    expect(await rolEnLaBase("intruso@ejemplo.test")).toBeUndefined();
  });

  it.each([
    ["/change-password", { currentPassword: CONTRASENA, newPassword: "otra-contrasena-larga-9" }],
    ["/change-email", { newEmail: "nuevo@ejemplo.test" }],
    ["/update-user", { name: "Otro nombre" }],
    ["/delete-user", { password: CONTRASENA }],
    ["/revoke-sessions", {}],
    ["/revoke-other-sessions", {}],
    ["/revoke-session", { token: "cualquiera" }],
  ])("la cuenta de prueba no puede usar %s (403)", async (ruta, cuerpo) => {
    const cookie = await conCookie(CORREO_DEMO);
    const respuesta = await llamarConCookie(ruta, cookie, cuerpo);
    expect(respuesta.status).toBe(403);

    // La contraseña, el correo y el nombre siguen como estaban.
    expect((await ingresar(CORREO_DEMO, CONTRASENA, "198.51.100.77")).status).toBe(200);
    const filas = await prisma.$queryRawUnsafe<{ name: string; email: string }[]>(
      "SELECT name, email FROM auth_users WHERE email = $1",
      CORREO_DEMO,
    );
    expect(filas).toEqual([{ name: "Demo", email: CORREO_DEMO }]);
  });

  it("las otras cuentas siguen pudiendo cambiar su contraseña y su nombre", async () => {
    const cookie = await conCookie(CORREO_SUPER);
    expect(
      (await llamarConCookie("/update-user", cookie, { name: "Jefe con otro nombre" })).status,
    ).toBe(200);
    expect(
      (
        await llamarConCookie("/change-password", cookie, {
          currentPassword: CONTRASENA,
          newPassword: "otra-contrasena-larga-9",
        })
      ).status,
    ).toBe(200);
    expect((await ingresar(CORREO_SUPER, "otra-contrasena-larga-9", "198.51.100.78")).status).toBe(
      200,
    );
  });

  it("actualizar la cuenta de prueba cambia su contraseña y su rol, y cierra sus sesiones", async () => {
    const cookie = await conCookie(CORREO_DEMO);
    await actualizarCuentaDeMesa(auth, {
      correo: CORREO_DEMO,
      nombre: "Demo",
      contrasena: "contrasena-rotada-123",
      rol: "DEMO",
    });

    expect((await ingresar(CORREO_DEMO, CONTRASENA, "198.51.100.80")).status).toBe(401);
    expect((await ingresar(CORREO_DEMO, "contrasena-rotada-123", "198.51.100.81")).status).toBe(
      200,
    );
    const actor = await exigirMesa(new Request(`${URL_BASE}/api/mesa/x`, { headers: { cookie } }));
    expect(actor).toBeInstanceOf(Response);

    await actualizarCuentaDeMesa(auth, {
      correo: CORREO_DEMO,
      nombre: "Demo",
      contrasena: "contrasena-rotada-123",
      rol: "MESA",
    });
    expect(await rolEnLaBase(CORREO_DEMO)).toBe("MESA");
  });

  it("actualizar una cuenta que no existe falla", async () => {
    await expect(
      actualizarCuentaDeMesa(auth, {
        correo: "nadie@ejemplo.test",
        nombre: "X",
        contrasena: CONTRASENA,
        rol: "DEMO",
      }),
    ).rejects.toThrow(/no existe/i);
  });
});
