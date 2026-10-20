import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createPrismaClient, crearAdaptadorDeAutenticacion } from "@kuorum/infrastructure";
import { crearAuth, type Autenticacion } from "../src/auth/crear-auth";
import { crearCuentaDeMesa } from "../src/auth/crear-cuenta";
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
    await crearCuentaDeMesa(auth, { correo: CORREO, nombre: "Mesa", contrasena: CONTRASENA });
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe("DELETE FROM auth_rate_limits");
    await prisma.$executeRawUnsafe("DELETE FROM auth_users");
    await prisma.$disconnect();
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
      crearCuentaDeMesa(auth, { correo: CORREO, nombre: "Otra", contrasena: CONTRASENA }),
    ).rejects.toThrow(/ya existe/i);
  });

  it("exigirMesa devuelve el actor con la cookie de sesión y 401 sin ella", async () => {
    const cookie = (await ingresar(CORREO, CONTRASENA)).headers.get("set-cookie") ?? "";
    const solicitud = new Request(`${URL_BASE}/api/mesa/x`, {
      headers: { cookie: cookie.split(";")[0] ?? "" },
    });
    const actor = await exigirMesa(solicitud);
    expect(actor).toEqual({ id: expect.any(String), correo: CORREO, nombre: "Mesa" });

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
