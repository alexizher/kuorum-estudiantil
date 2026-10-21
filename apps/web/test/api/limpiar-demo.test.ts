import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, dynamic } from "../../src/app/api/tareas/limpiar-demo/route";
import { contenedor } from "../../src/composicion";

vi.mock("../../src/composicion", () => ({ contenedor: vi.fn() }));

const SECRETO = "secreto-de-cron-de-prueba-0123456789";
const ejecutar = vi.fn();

function llamar(autorizacion?: string): Promise<Response> {
  return GET(
    new Request("http://localhost/api/tareas/limpiar-demo", {
      headers: autorizacion === undefined ? {} : { authorization: autorizacion },
    }),
  );
}

beforeEach(() => {
  ejecutar.mockReset().mockResolvedValue(3);
  vi.mocked(contenedor).mockReturnValue({
    limpiarSesionesDeDemo: { ejecutar },
  } as unknown as ReturnType<typeof contenedor>);
  vi.stubEnv("CRON_SECRET", SECRETO);
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/tareas/limpiar-demo", () => {
  it("no se cachea nunca", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("con el secreto correcto limpia y cuenta las sesiones borradas, sin caché", async () => {
    const r = await llamar(`Bearer ${SECRETO}`);
    expect(r.status).toBe(200);
    expect(r.headers.get("Cache-Control")).toBe("no-store");
    expect(await r.json()).toEqual({ eliminadas: 3 });
    expect(ejecutar).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["sin cabecera", undefined],
    ["con otro secreto", "Bearer otro-secreto-distinto-0123456789ab"],
    ["con un prefijo del secreto", `Bearer ${SECRETO.slice(0, 10)}`],
    ["con el secreto más largo", `Bearer ${SECRETO}x`],
    ["sin la palabra Bearer", SECRETO],
    ["con otro esquema", `Basic ${SECRETO}`],
    ["con Bearer en minúsculas", `bearer ${SECRETO}`],
    ["vacía", ""],
  ])("%s da 401 y no limpia nada", async (_caso, cabecera) => {
    const r = await llamar(cabecera);
    expect(r.status).toBe(401);
    expect(r.headers.get("Cache-Control")).toBe("no-store");
    expect(ejecutar).not.toHaveBeenCalled();
  });

  it.each([undefined, ""])("si CRON_SECRET es %j no hay forma de entrar", async (valor) => {
    vi.stubEnv("CRON_SECRET", valor as string);
    for (const cabecera of ["Bearer ", "Bearer undefined", "Bearer", undefined]) {
      expect((await llamar(cabecera)).status).toBe(401);
    }
    expect(ejecutar).not.toHaveBeenCalled();
  });

  it("si la limpieza falla responde 500 sin detalles", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    ejecutar.mockRejectedValue(new Error("base caída"));
    const r = await llamar(`Bearer ${SECRETO}`);
    expect(r.status).toBe(500);
    expect(await r.json()).toEqual({ error: "ERROR_INTERNO" });
  });
});
