import { describe, expect, it, vi } from "vitest";
import { contenedor } from "@/composicion";
import { exigirMesa } from "@/http/exigir-mesa";

vi.mock("@/composicion", () => ({ contenedor: vi.fn() }));

let membresias: { usuarioId: string; cuerpoId: string; rol: string }[] = [];

function conSesion(sesion: unknown) {
  vi.mocked(contenedor).mockReturnValue({
    autenticacion: () => ({ api: { getSession: vi.fn(async () => sesion) } }),
    membresias: { deUsuario: vi.fn(async () => membresias) },
  } as unknown as ReturnType<typeof contenedor>);
}

describe("exigirMesa", () => {
  it("sin sesión responde 401 NO_AUTENTICADO y no cachea", async () => {
    conSesion(null);
    const respuesta = (await exigirMesa(new Request("http://x.test/api/mesa"))) as Response;
    expect(respuesta.status).toBe(401);
    expect(respuesta.headers.get("Cache-Control")).toBe("no-store");
    expect(await respuesta.json()).toEqual({ error: "NO_AUTENTICADO" });
  });

  it("con sesión devuelve solo id, correo, nombre, rol y membresías", async () => {
    membresias = [];
    conSesion({
      user: {
        id: "u1",
        email: "a@b.test",
        name: "Ana",
        image: null,
        emailVerified: true,
        rol: "SUPERADMIN",
      },
      session: { token: "secreto" },
    });
    expect(await exigirMesa(new Request("http://x.test/api/mesa"))).toEqual({
      id: "u1",
      correo: "a@b.test",
      nombre: "Ana",
      rol: "SUPERADMIN",
      membresias: [],
    });
  });

  it("trae las membresías del usuario, solo cuerpo y rol", async () => {
    membresias = [{ usuarioId: "u1", cuerpoId: "c1", rol: "ENCARGADO" }];
    conSesion({ user: { id: "u1", email: "a@b.test", name: "Ana", rol: "MESA" } });
    expect(await exigirMesa(new Request("http://x.test/api/mesa"))).toMatchObject({
      membresias: [{ cuerpoId: "c1", rol: "ENCARGADO" }],
    });
    membresias = [];
  });

  it.each(["SUPERADMIN", "MESA", "DEMO"])("conserva el rol %s", async (rol) => {
    conSesion({ user: { id: "u1", email: "a@b.test", name: "Ana", rol } });
    expect(await exigirMesa(new Request("http://x.test/api/mesa"))).toMatchObject({ rol });
  });

  it.each([undefined, null, "", "ROOT", 7])(
    "un rol ausente o desconocido (%s) se trata como DEMO, el más restringido",
    async (rol) => {
      conSesion({ user: { id: "u1", email: "a@b.test", name: "Ana", rol } });
      expect(await exigirMesa(new Request("http://x.test/api/mesa"))).toMatchObject({
        rol: "DEMO",
      });
    },
  );

  it("si la autenticación falla, responde 401 en vez de filtrar el error", async () => {
    vi.mocked(contenedor).mockReturnValue({
      autenticacion: () => ({
        api: {
          getSession: vi.fn(async () => {
            throw new Error("base caída");
          }),
        },
      }),
    } as unknown as ReturnType<typeof contenedor>);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const respuesta = (await exigirMesa(new Request("http://x.test/api/mesa"))) as Response;
    expect(respuesta.status).toBe(401);
  });

  it("registra solo el mensaje del error, sin el objeto con sus parámetros", async () => {
    const error = Object.assign(new Error("consulta fallida"), {
      meta: { parametros: ["token-de-sesion-secreto"] },
    });
    vi.mocked(contenedor).mockReturnValue({
      autenticacion: () => ({
        api: {
          getSession: vi.fn(async () => {
            throw error;
          }),
        },
      }),
    } as unknown as ReturnType<typeof contenedor>);
    const registro = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await exigirMesa(new Request("http://x.test/api/mesa"));
    const argumentos: unknown[] = registro.mock.calls.flat();
    expect(argumentos).not.toContain(error);
    expect(argumentos.every((a) => typeof a === "string")).toBe(true);
    expect(argumentos.join(" ")).toContain("consulta fallida");
    expect(argumentos.join(" ")).not.toContain("token-de-sesion-secreto");
    registro.mockRestore();
  });
});
