import { describe, expect, it, vi } from "vitest";
import { GenerarCodigosDeAcceso, IngresarASala } from "../../src/index.js";
import { crearEscenario, sembrarSesion, type Escenario } from "../dobles/escenario.js";
import { superadmin } from "../dobles/actores.js";

const TOKEN = "3f2b8c1e-5d4a-4b7e-9c0a-1d2e3f4a5b6c";

/** Las sesiones se copian al leer y al guardar: las aserciones ven solo lo que se guardó. */
function escenarioQueCopia(): Escenario {
  const e = crearEscenario();
  e.sesiones.copiar = true;
  return e;
}

async function versionGuardada(e: Escenario, id: string): Promise<number | undefined> {
  return (await e.sesiones.porId(id))?.version;
}

function ingresar(e: Escenario) {
  return new IngresarASala(e.sesiones, e.participantes, e.unidad, e.hasheador, e.ids, e.reloj);
}

async function salaConCodigos(e: Escenario, estado: "PROGRAMADA" | "EN_CURSO" = "EN_CURSO") {
  const sesion = await sembrarSesion(e, { modo: "CON_CODIGOS", estado });
  const generar = new GenerarCodigosDeAcceso(
    e.sesiones,
    e.participantes,
    e.unidad,
    e.codigos,
    e.hasheador,
  );
  const [primero = "", segundo = ""] = await generar.ejecutar(superadmin, sesion.id, 2);
  return { sesion, codigos: [primero, segundo] as const };
}

describe("IngresarASala con código", () => {
  it("activa el código, crea al participante y sube la versión", async () => {
    const e = escenarioQueCopia();
    const { sesion, codigos } = await salaConCodigos(e);
    const versionAntes = sesion.version;

    const resultado = await ingresar(e).ejecutar(sesion.codigoDeSala.valor, {
      tipo: "CODIGO",
      codigo: codigos[0],
    });

    expect(resultado.sesionId).toBe(sesion.id);
    expect(await e.participantes.contarActivos(sesion.id)).toBe(1);
    expect(await versionGuardada(e, sesion.id)).toBe(versionAntes + 1);
    expect(e.participantes.volcado()).not.toContain(codigos[0]);
  });

  it("el mismo código da el mismo participante y la asistencia cuenta 1", async () => {
    const e = escenarioQueCopia();
    const { sesion, codigos } = await salaConCodigos(e);
    const credencial = { tipo: "CODIGO", codigo: codigos[0] } as const;

    const primero = await ingresar(e).ejecutar(sesion.codigoDeSala.valor, credencial);
    const versionTrasPrimero = await versionGuardada(e, sesion.id);
    const segundo = await ingresar(e).ejecutar(sesion.codigoDeSala.valor, credencial);

    expect(segundo.participanteId).toBe(primero.participanteId);
    expect(await e.participantes.contarActivos(sesion.id)).toBe(1);
    expect(versionTrasPrimero).toBe(sesion.version + 1);
    expect(await versionGuardada(e, sesion.id)).toBe(versionTrasPrimero);
  });

  it("acepta el código en minúsculas y sin guion", async () => {
    const e = crearEscenario();
    const { sesion, codigos } = await salaConCodigos(e);
    const a = await ingresar(e).ejecutar(sesion.codigoDeSala.valor, {
      tipo: "CODIGO",
      codigo: codigos[0],
    });
    const b = await ingresar(e).ejecutar(sesion.codigoDeSala.valor.toLowerCase(), {
      tipo: "CODIGO",
      codigo: codigos[0].replace("-", "").toLowerCase(),
    });
    expect(b.participanteId).toBe(a.participanteId);
  });

  it("códigos distintos dan participantes distintos", async () => {
    const e = crearEscenario();
    const { sesion, codigos } = await salaConCodigos(e);
    const a = await ingresar(e).ejecutar(sesion.codigoDeSala.valor, {
      tipo: "CODIGO",
      codigo: codigos[0],
    });
    const b = await ingresar(e).ejecutar(sesion.codigoDeSala.valor, {
      tipo: "CODIGO",
      codigo: codigos[1],
    });
    expect(a.participanteId).not.toBe(b.participanteId);
    expect(await e.participantes.contarActivos(sesion.id)).toBe(2);
  });

  it("falla con CODIGO_NO_EXISTE si nadie lo generó", async () => {
    const e = crearEscenario();
    const { sesion } = await salaConCodigos(e);
    await expect(
      ingresar(e).ejecutar(sesion.codigoDeSala.valor, { tipo: "CODIGO", codigo: "ZZZZ-ZZZZ" }),
    ).rejects.toMatchObject({ codigo: "CODIGO_NO_EXISTE" });
  });

  it("un código de otra sala no sirve", async () => {
    const e = crearEscenario();
    const a = await salaConCodigos(e);
    const b = await salaConCodigos(e);
    await expect(
      ingresar(e).ejecutar(b.sesion.codigoDeSala.valor, { tipo: "CODIGO", codigo: a.codigos[0] }),
    ).rejects.toMatchObject({ codigo: "CODIGO_NO_EXISTE" });
  });

  it("deja entrar con la sala PROGRAMADA", async () => {
    const e = crearEscenario();
    const { sesion, codigos } = await salaConCodigos(e, "PROGRAMADA");
    const r = await ingresar(e).ejecutar(sesion.codigoDeSala.valor, {
      tipo: "CODIGO",
      codigo: codigos[0],
    });
    expect(r.sesionId).toBe(sesion.id);
  });
});

describe("IngresarASala con navegador", () => {
  it("si otra entrada creó al participante en medio, devuelve al existente", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e, { estado: "ABIERTA" });
    const credencial = { tipo: "NAVEGADOR", token: TOKEN } as const;
    const primero = await ingresar(e).ejecutar(sesion.codigoDeSala.valor, credencial);
    // La otra entrada aún no veía al participante cuando consultó.
    vi.spyOn(e.participantes, "porCredencial").mockResolvedValueOnce(null);

    const segundo = await ingresar(e).ejecutar(sesion.codigoDeSala.valor, credencial);

    expect(segundo.participanteId).toBe(primero.participanteId);
    expect(e.participantes.participantes).toHaveLength(1);
  });

  it("crea un participante y el mismo token lo recupera sin cambiar la versión", async () => {
    const e = escenarioQueCopia();
    const sesion = await sembrarSesion(e, { estado: "ABIERTA" });
    const credencial = { tipo: "NAVEGADOR", token: TOKEN } as const;

    const primero = await ingresar(e).ejecutar(sesion.codigoDeSala.valor, credencial);
    const segundo = await ingresar(e).ejecutar(sesion.codigoDeSala.valor, credencial);

    expect(segundo.participanteId).toBe(primero.participanteId);
    expect(primero.sesionId).toBe(sesion.id);
    expect(e.participantes.participantes).toHaveLength(1);
    expect(await versionGuardada(e, sesion.id)).toBe(0);
    expect(e.participantes.volcado()).not.toContain(TOKEN);
  });

  it("rechaza un token que no es UUID v4", async () => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e);
    for (const token of ["", "abc", "3f2b8c1e-5d4a-1b7e-9c0a-1d2e3f4a5b6c", `${TOKEN}x`]) {
      await expect(
        ingresar(e).ejecutar(sesion.codigoDeSala.valor, { tipo: "NAVEGADOR", token }),
      ).rejects.toMatchObject({ codigo: "TOKEN_INVALIDO" });
    }
  });

  it("falla con MODO_REQUIERE_CODIGO en modo con códigos", async () => {
    const e = crearEscenario();
    const { sesion } = await salaConCodigos(e);
    await expect(
      ingresar(e).ejecutar(sesion.codigoDeSala.valor, { tipo: "NAVEGADOR", token: TOKEN }),
    ).rejects.toMatchObject({ codigo: "MODO_REQUIERE_CODIGO" });
  });
});

describe("IngresarASala, sala no disponible", () => {
  it("falla si la sala no existe", async () => {
    const e = crearEscenario();
    await expect(
      ingresar(e).ejecutar("AAAA", { tipo: "NAVEGADOR", token: TOKEN }),
    ).rejects.toMatchObject({ codigo: "SALA_NO_DISPONIBLE" });
  });

  it.each(["CERRADA", "ACTA_FINAL", "CANCELADA"] as const)("falla si está %s", async (estado) => {
    const e = crearEscenario();
    const sesion = await sembrarSesion(e, { estado });
    await expect(
      ingresar(e).ejecutar(sesion.codigoDeSala.valor, { tipo: "NAVEGADOR", token: TOKEN }),
    ).rejects.toMatchObject({ codigo: "SALA_NO_DISPONIBLE" });
  });

  it("rechaza un código de sala mal formado", async () => {
    const e = crearEscenario();
    await expect(
      ingresar(e).ejecutar("xx", { tipo: "NAVEGADOR", token: TOKEN }),
    ).rejects.toMatchObject({ codigo: "CODIGO_DE_SALA_INVALIDO" });
  });
});
