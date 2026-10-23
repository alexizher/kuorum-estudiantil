import { createPrismaClient } from "@kuorum/infrastructure";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET as estado } from "../src/app/api/public/v1/salas/[codigo]/estado/route";
import { POST as ingresar } from "../src/app/api/public/v1/salas/[codigo]/ingresar/route";
import { POST as votar } from "../src/app/api/public/v1/salas/[codigo]/votos/route";
import { contenedor } from "../src/composicion";

const URL_DE_PRUEBAS =
  process.env["DATABASE_URL"] ?? "postgresql://kuorum:kuorum@localhost:54329/kuorum";
const prisma = createPrismaClient(URL_DE_PRUEBAS);
const TITULO = "Prueba de API de sala";
const ID_DE_USUARIO = "u-api-int";
let sesionId = "";
let codigoDeSala = "";
let preguntaId = "";
let opcionId = "";

function post(ruta: string, cuerpo: unknown, cookie?: string): Request {
  return new Request(`http://localhost/api/public/v1/salas/${codigoDeSala}/${ruta}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie === undefined ? {} : { cookie }),
    },
    body: JSON.stringify(cuerpo),
  });
}
const params = () => ({ params: Promise.resolve({ codigo: codigoDeSala }) });

describe("API de la sala con la composición real (Postgres local)", () => {
  beforeAll(async () => {
    if (!["localhost", "127.0.0.1"].includes(new URL(URL_DE_PRUEBAS).hostname)) {
      throw new Error("Las pruebas de integración solo corren contra Postgres local.");
    }
    process.env["DATABASE_URL"] = URL_DE_PRUEBAS;
    process.env["KUORUM_SECRETO"] = "secreto-de-prueba-de-al-menos-32-caracteres";
    await prisma.sesion.deleteMany({ where: { titulo: TITULO } });

    const c = contenedor();
    // creadaPorId apunta a auth_users: la sesión necesita un usuario real.
    await prisma.user.deleteMany({ where: { id: ID_DE_USUARIO } });
    await prisma.user.create({
      data: {
        id: ID_DE_USUARIO,
        name: "Mesa",
        email: `${ID_DE_USUARIO}@api-int.test`,
        rol: "SUPERADMIN",
      },
    });
    const actor = { id: ID_DE_USUARIO, rol: "SUPERADMIN", membresias: [] } as const;
    const sesion = await c.crearSesion.ejecutar(actor, {
      titulo: TITULO,
      modo: "SALA_ABIERTA",
      cuerpoId: "cuerpo-general",
      inicioLocal: "2026-11-03T14:00",
      finLocal: "2026-11-03T16:00",
      modalidad: "PRESENCIAL",
    });
    sesionId = sesion.id;
    codigoDeSala = sesion.codigoDeSala.valor;
    await c.iniciarSesion.ejecutar(actor, sesionId);
    const pregunta = await c.crearPregunta.ejecutar(actor, sesionId, "¿Aprobamos?", ["Sí", "No"]);
    preguntaId = pregunta.id;
    opcionId = pregunta.opciones[0]?.id ?? "";
    await c.abrirPregunta.ejecutar(actor, preguntaId);
  });

  afterAll(async () => {
    await prisma.sesion.deleteMany({ where: { titulo: TITULO } });
    await prisma.user.deleteMany({ where: { id: ID_DE_USUARIO } });
    await prisma.$disconnect();
  });

  it("ingresar, votar y votar de nuevo da 201 y luego 409 YA_VOTO", async () => {
    const entrada = await ingresar(
      post("ingresar", { tokenNavegador: crypto.randomUUID() }),
      params(),
    );
    expect(entrada.status).toBe(200);
    expect(await entrada.json()).toEqual({ ok: true });
    const cookie = (entrada.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
    expect(cookie).toMatch(new RegExp(`^kuorum_p_${codigoDeSala}=`));

    const primero = await votar(post("votos", { preguntaId, opcionId }, cookie), params());
    expect(primero.status).toBe(201);
    expect(await primero.json()).toEqual({ votado: true });

    const segundo = await votar(post("votos", { preguntaId, opcionId }, cookie), params());
    expect(segundo.status).toBe(409);
    expect(await segundo.json()).toMatchObject({ error: "YA_VOTO" });

    const publico = await estado(
      new Request(`http://localhost/api/public/v1/salas/${codigoDeSala}/estado`),
      params(),
    );
    expect(publico.status).toBe(200);
    const cuerpo = await publico.json();
    expect(cuerpo.pregunta.votosEmitidos).toBe(1);
    expect(publico.headers.get("ETag")).toBe(`W/"${cuerpo.version}-1"`);
  });

  it("sin cookie no se vota (401 SIN_INGRESO)", async () => {
    const sinCookie = await votar(post("votos", { preguntaId, opcionId }), params());
    expect(sinCookie.status).toBe(401);
    expect(await sinCookie.json()).toEqual({ error: "SIN_INGRESO" });
  });

  it("el mismo token del navegador desde dos requests sin cookie da el mismo participante", async () => {
    const token = crypto.randomUUID();
    const a = await ingresar(post("ingresar", { tokenNavegador: token }), params());
    const b = await ingresar(post("ingresar", { tokenNavegador: token }), params());
    expect(a.headers.get("set-cookie")).toBe(b.headers.get("set-cookie"));
    const filas = await prisma.participante.count({ where: { sesionId } });
    expect(filas).toBe(2);
  });
});
