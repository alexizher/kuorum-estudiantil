import { ErrorDeDominio } from "@kuorum/domain";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as cruces } from "../../src/app/api/mesa/v1/cruces/route";
import { POST as crearCuerpo } from "../../src/app/api/mesa/v1/cuerpos/route";
import { PATCH as cambiarCuerpo } from "../../src/app/api/mesa/v1/cuerpos/[id]/route";
import {
  GET as leerInstitucion,
  PATCH as configurar,
} from "../../src/app/api/mesa/v1/institucion/route";
import {
  GET as listarPersonal,
  POST as crearPersona,
} from "../../src/app/api/mesa/v1/personal/route";
import { POST as restablecer } from "../../src/app/api/mesa/v1/personal/[id]/contrasena/route";
import {
  DELETE as quitar,
  PUT as asignar,
} from "../../src/app/api/mesa/v1/personal/[id]/membresias/route";
import { contenedor } from "../../src/composicion";

vi.mock("../../src/composicion", () => ({ contenedor: vi.fn() }));

const ejecutar = () => ({ ejecutar: vi.fn(async (): Promise<unknown> => undefined) });
const casos = {
  configurarInstitucion: ejecutar(),
  crearCuerpo: ejecutar(),
  renombrarCuerpo: ejecutar(),
  archivarCuerpo: ejecutar(),
  asignarMembresia: ejecutar(),
  quitarMembresia: ejecutar(),
  listarPersonal: ejecutar(),
  crearCuentaDePersonal: ejecutar(),
  restablecerContrasena: ejecutar(),
  buscarCruces: ejecutar(),
};
let rolActual = "SUPERADMIN";
let membresiasActuales: { cuerpoId: string; rol: string }[] = [];
const ACTOR = { id: "u1", correo: "a@x.test", nombre: "Admin", rol: "SUPERADMIN", membresias: [] };

const general = {
  id: "c-g",
  nombre: "Asamblea general",
  slug: "asamblea-general",
  tipo: "GENERAL",
  archivado: false,
};
const artes = { id: "c-a", nombre: "Artes", slug: "artes", tipo: "FACULTAD", archivado: false };
const vieja = { id: "c-v", nombre: "Vieja", slug: "vieja", tipo: "FACULTAD", archivado: true };

beforeEach(() => {
  rolActual = "SUPERADMIN";
  membresiasActuales = [];
  for (const c of Object.values(casos)) c.ejecutar.mockReset();
  vi.mocked(contenedor).mockReturnValue({
    ...casos,
    membresias: {
      deUsuario: vi.fn(async () => membresiasActuales.map((m) => ({ usuarioId: "u1", ...m }))),
    },
    cuerpos: { listar: vi.fn(async () => [general, artes, vieja]) },
    institucion: {
      obtener: vi.fn(async () => ({
        nombre: "Universidad",
        tipoDeCuerpoSingular: "Facultad",
        tipoDeCuerpoPlural: "Facultades",
        zonaHoraria: "America/Bogota",
      })),
    },
    autenticacion: () => ({
      api: {
        getSession: vi.fn(async () => ({
          user: { id: "u1", email: "a@x.test", name: "Admin", rol: rolActual },
        })),
      },
    }),
  } as unknown as ReturnType<typeof contenedor>);
});

function pedir(metodo: string, cuerpo?: unknown, url = "http://localhost/api/mesa/v1/x"): Request {
  return new Request(url, {
    method: metodo,
    headers: cuerpo === undefined ? {} : { "content-type": "application/json" },
    ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }),
  });
}
const idp = (id: string) => ({ params: Promise.resolve({ id }) });

describe("institución", () => {
  it("GET da la institución y los cuerpos con cuáles puede programar el actor", async () => {
    rolActual = "MESA";
    membresiasActuales = [{ cuerpoId: "c-a", rol: "ENCARGADO" }];
    const r = await leerInstitucion(pedir("GET"));
    expect(r.status).toBe(200);
    expect(r.headers.get("Cache-Control")).toBe("no-store");
    expect(await r.json()).toEqual({
      institucion: {
        nombre: "Universidad",
        tipoDeCuerpoSingular: "Facultad",
        tipoDeCuerpoPlural: "Facultades",
        zonaHoraria: "America/Bogota",
      },
      cuerpos: [
        { ...general, puedeProgramar: false },
        { ...artes, puedeProgramar: true },
        { ...vieja, puedeProgramar: false },
      ],
    });
  });

  it("PATCH configura y valida", async () => {
    expect((await configurar(pedir("PATCH", { nombre: "Otra" }))).status).toBe(204);
    expect(casos.configurarInstitucion.ejecutar).toHaveBeenCalledWith(ACTOR, { nombre: "Otra" });
    expect((await configurar(pedir("PATCH", {}))).status).toBe(400);
  });

  it("SOLO_ADMINISTRADOR da 403", async () => {
    rolActual = "MESA";
    casos.configurarInstitucion.ejecutar.mockRejectedValueOnce(
      new ErrorDeDominio("SOLO_ADMINISTRADOR"),
    );
    const r = await configurar(pedir("PATCH", { nombre: "Otra" }));
    expect(r.status).toBe(403);
  });

  it("ZONA_HORARIA_INVALIDA da 422 con mensaje", async () => {
    casos.configurarInstitucion.ejecutar.mockRejectedValueOnce(
      new ErrorDeDominio("ZONA_HORARIA_INVALIDA"),
    );
    const r = await configurar(pedir("PATCH", { zonaHoraria: "Marte" }));
    expect(r.status).toBe(422);
    expect((await r.json()).mensaje).toBeDefined();
  });
});

describe("cuerpos", () => {
  it("POST crea (201) y CUERPO_REPETIDO da 409", async () => {
    casos.crearCuerpo.ejecutar.mockResolvedValueOnce({
      id: "c-n",
      nombre: "Música",
      slug: "musica",
      tipo: "FACULTAD",
      archivado: false,
    });
    const r = await crearCuerpo(pedir("POST", { nombre: "Música" }));
    expect(r.status).toBe(201);
    expect(await r.json()).toEqual({
      id: "c-n",
      nombre: "Música",
      slug: "musica",
      tipo: "FACULTAD",
      archivado: false,
    });
    casos.crearCuerpo.ejecutar.mockRejectedValueOnce(new ErrorDeDominio("CUERPO_REPETIDO"));
    expect((await crearCuerpo(pedir("POST", { nombre: "Música" }))).status).toBe(409);
    expect((await crearCuerpo(pedir("POST", {}))).status).toBe(400);
  });

  it("PATCH renombra o archiva; GENERAL_NO_SE_ARCHIVA da 409", async () => {
    expect(
      (await cambiarCuerpo(pedir("PATCH", { nombre: "Artes y Música" }), idp("c-a"))).status,
    ).toBe(204);
    expect(casos.renombrarCuerpo.ejecutar).toHaveBeenCalledWith(ACTOR, "c-a", "Artes y Música");
    expect((await cambiarCuerpo(pedir("PATCH", { archivado: true }), idp("c-a"))).status).toBe(204);
    expect(casos.archivarCuerpo.ejecutar).toHaveBeenCalledWith(ACTOR, "c-a");
    casos.archivarCuerpo.ejecutar.mockRejectedValueOnce(
      new ErrorDeDominio("GENERAL_NO_SE_ARCHIVA"),
    );
    expect((await cambiarCuerpo(pedir("PATCH", { archivado: true }), idp("c-g"))).status).toBe(409);
  });
});

describe("personal", () => {
  it("GET lista; POST devuelve la contraseña una vez y sin caché", async () => {
    casos.listarPersonal.ejecutar.mockResolvedValueOnce([
      {
        id: "u2",
        nombre: "Ana",
        correo: "ana@x.test",
        membresias: [{ usuarioId: "u2", cuerpoId: "c-a", rol: "MESA" }],
      },
    ]);
    expect(await (await listarPersonal(pedir("GET"))).json()).toEqual({
      personal: [
        {
          id: "u2",
          nombre: "Ana",
          correo: "ana@x.test",
          membresias: [{ cuerpoId: "c-a", rol: "MESA" }],
        },
      ],
    });
    casos.crearCuentaDePersonal.ejecutar.mockResolvedValueOnce({
      usuarioId: "u2",
      contrasena: "secreta-1234",
    });
    const r = await crearPersona(pedir("POST", { correo: "ana@x.test", nombre: "Ana" }));
    expect(r.status).toBe(201);
    expect(r.headers.get("Cache-Control")).toBe("no-store");
    expect(await r.json()).toEqual({ usuarioId: "u2", contrasena: "secreta-1234" });
    expect((await crearPersona(pedir("POST", { correo: "ana", nombre: "Ana" }))).status).toBe(400);
  });

  it("un correo repetido da 409 con mensaje", async () => {
    casos.crearCuentaDePersonal.ejecutar.mockRejectedValueOnce(
      new ErrorDeDominio("CORREO_REPETIDO", "Ya existe una cuenta con el correo ana@x.test."),
    );
    const r = await crearPersona(pedir("POST", { correo: "ana@x.test", nombre: "Ana" }));
    expect(r.status).toBe(409);
    expect((await r.json()).mensaje).toMatch(/correo/);
  });

  it("PUT asigna, DELETE quita con ?cuerpo= y POST contrasena restablece", async () => {
    expect(
      (await asignar(pedir("PUT", { cuerpoId: "c-a", rol: "ENCARGADO" }), idp("u2"))).status,
    ).toBe(204);
    expect(casos.asignarMembresia.ejecutar).toHaveBeenCalledWith(ACTOR, "u2", "c-a", "ENCARGADO");
    expect((await asignar(pedir("PUT", { cuerpoId: "c-a", rol: "JEFE" }), idp("u2"))).status).toBe(
      400,
    );
    expect(
      (
        await quitar(
          pedir(
            "DELETE",
            undefined,
            "http://localhost/api/mesa/v1/personal/u2/membresias?cuerpo=c-a",
          ),
          idp("u2"),
        )
      ).status,
    ).toBe(204);
    expect(casos.quitarMembresia.ejecutar).toHaveBeenCalledWith(ACTOR, "u2", "c-a");
    expect((await quitar(pedir("DELETE"), idp("u2"))).status).toBe(400);
    casos.restablecerContrasena.ejecutar.mockResolvedValueOnce({ contrasena: "nueva-1234567" });
    const r = await restablecer(pedir("POST"), idp("u2"));
    expect(r.headers.get("Cache-Control")).toBe("no-store");
    expect(await r.json()).toEqual({ contrasena: "nueva-1234567" });
  });
});

describe("cruces", () => {
  it("pasa el tramo y devuelve los cruces en hora local", async () => {
    casos.buscarCruces.ejecutar.mockResolvedValueOnce([
      {
        id: "s2",
        titulo: "Asamblea de Artes",
        cuerpo: { id: "c-a", nombre: "Artes", slug: "artes" },
        inicio: new Date("2026-11-03T19:00:00Z"),
        fin: new Date("2026-11-03T21:00:00Z"),
        modalidad: "PRESENCIAL",
        lugar: null,
        estado: "PROGRAMADA",
      },
    ]);
    const r = await cruces(
      pedir(
        "GET",
        undefined,
        "http://localhost/api/mesa/v1/cruces?inicio=2026-11-03T13:00&fin=2026-11-03T15:00&excluir=s1",
      ),
    );
    expect(await r.json()).toEqual({
      cruces: [
        {
          id: "s2",
          titulo: "Asamblea de Artes",
          cuerpo: "Artes",
          inicioLocal: "2026-11-03T14:00",
          finLocal: "2026-11-03T16:00",
        },
      ],
    });
    expect(casos.buscarCruces.ejecutar).toHaveBeenCalledWith(ACTOR, {
      inicioLocal: "2026-11-03T13:00",
      finLocal: "2026-11-03T15:00",
      excluirId: "s1",
    });
  });

  it("sin inicio o con una hora mal escrita da 400", async () => {
    expect(
      (
        await cruces(
          pedir("GET", undefined, "http://localhost/api/mesa/v1/cruces?fin=2026-11-03T15:00"),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await cruces(
          pedir(
            "GET",
            undefined,
            "http://localhost/api/mesa/v1/cruces?inicio=hoy&fin=2026-11-03T15:00",
          ),
        )
      ).status,
    ).toBe(400);
  });
});
