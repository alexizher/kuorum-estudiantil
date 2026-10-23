import { describe, expect, it, vi } from "vitest";
import { ClienteDeMesaPorFetch, ErrorDeMesa } from "../../src/vistas/mesa/cliente-de-mesa";

function conRespuesta(respuesta: Response) {
  const fetchFalso = vi.fn<typeof fetch>(async () => respuesta);
  return { fetchFalso, cliente: new ClienteDeMesaPorFetch(fetchFalso) };
}

describe("ClienteDeMesaPorFetch", () => {
  it("lista las sesiones", async () => {
    const sesion = {
      id: "s1",
      titulo: "A",
      codigoDeSala: "K7F2",
      estado: "EN_CURSO",
      modo: "CON_CODIGOS",
      creadaEn: "2026-10-20T10:00:00.000Z",
    };
    const { cliente, fetchFalso } = conRespuesta(Response.json({ sesiones: [sesion] }));
    expect(await cliente.listarSesiones()).toEqual([sesion]);
    expect(fetchFalso.mock.calls[0]?.[0]).toBe("/api/mesa/v1/sesiones");
  });

  it("pide también las sesiones de la cuenta de prueba solo si se le dice", async () => {
    const { cliente, fetchFalso } = conRespuesta(Response.json({ sesiones: [] }));
    await cliente.listarSesiones({ incluirCuentaDePrueba: true });
    expect(fetchFalso.mock.calls[0]?.[0]).toBe("/api/mesa/v1/sesiones?incluirPrueba=1");
  });

  it("crea una sesión con el cuerpo en JSON", async () => {
    const { cliente, fetchFalso } = conRespuesta(Response.json({ id: "s1" }, { status: 201 }));
    await cliente.crearSesion({
      titulo: "Asamblea",
      modo: "SALA_ABIERTA",
      segundosPorIntervencion: 120,
      cuerpoId: "c1",
      inicio: "2026-11-03T14:00",
      fin: "2026-11-03T16:00",
      modalidad: "PRESENCIAL",
    });
    const [url, opciones] = fetchFalso.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/mesa/v1/sesiones");
    expect(opciones.method).toBe("POST");
    expect(JSON.parse(String(opciones.body))).toEqual({
      titulo: "Asamblea",
      modo: "SALA_ABIERTA",
      segundosPorIntervencion: 120,
      cuerpoId: "c1",
      inicio: "2026-11-03T14:00",
      fin: "2026-11-03T16:00",
      modalidad: "PRESENCIAL",
    });
  });

  it("lee la institución con los cuerpos", async () => {
    const datos = {
      institucion: {
        nombre: "U",
        tipoDeCuerpoSingular: "Facultad",
        tipoDeCuerpoPlural: "Facultades",
        zonaHoraria: "America/Bogota",
      },
      cuerpos: [
        {
          id: "c1",
          nombre: "Artes",
          slug: "artes",
          tipo: "FACULTAD",
          archivado: false,
          puedeProgramar: true,
        },
      ],
    };
    const { cliente, fetchFalso } = conRespuesta(Response.json(datos));
    expect(await cliente.leerInstitucion()).toEqual(datos);
    expect(fetchFalso.mock.calls[0]?.[0]).toBe("/api/mesa/v1/institucion");
  });

  it("busca cruces con el tramo y la sesión a excluir en la URL", async () => {
    const { cliente, fetchFalso } = conRespuesta(Response.json({ cruces: [] }));
    expect(
      await cliente.buscarCruces({
        inicio: "2026-11-03T14:00",
        fin: "2026-11-03T16:00",
        excluir: "s 1",
      }),
    ).toEqual([]);
    expect(fetchFalso.mock.calls[0]?.[0]).toBe(
      "/api/mesa/v1/cruces?inicio=2026-11-03T14%3A00&fin=2026-11-03T16%3A00&excluir=s+1",
    );
  });

  it("reprograma con los cambios y cancela", async () => {
    const { cliente, fetchFalso } = conRespuesta(new Response(null, { status: 204 }));
    await cliente.reprogramar("s1", { inicio: "2026-11-05T09:00", lugar: null });
    await cliente.cancelar("s1");
    const [url, opciones] = fetchFalso.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/mesa/v1/sesiones/s1/reprogramar");
    expect(JSON.parse(String(opciones.body))).toEqual({ inicio: "2026-11-05T09:00", lugar: null });
    expect(fetchFalso.mock.calls[1]?.[0]).toBe("/api/mesa/v1/sesiones/s1/cancelar");
  });

  it("genera códigos y devuelve el texto plano", async () => {
    const { cliente, fetchFalso } = conRespuesta(Response.json({ codigos: ["AAAA-2222"] }));
    expect(await cliente.generarCodigos("s 1", 1)).toEqual(["AAAA-2222"]);
    expect(fetchFalso.mock.calls[0]?.[0]).toBe("/api/mesa/v1/sesiones/s%201/codigos");
  });

  it("pregunta: crear, abrir, cerrar, anular y proyectar apuntan a su ruta", async () => {
    const { cliente, fetchFalso } = conRespuesta(new Response(null, { status: 204 }));
    await cliente.abrirPregunta("p1");
    await cliente.anularPregunta("p1");
    await cliente.proyectarPregunta("p1");
    expect(fetchFalso.mock.calls.map((c) => c[0])).toEqual([
      "/api/mesa/v1/preguntas/p1/abrir",
      "/api/mesa/v1/preguntas/p1/anular",
      "/api/mesa/v1/preguntas/p1/proyectar",
    ]);
  });

  it("cerrar devuelve el resultado de la respuesta", async () => {
    const resultado = { totalVotos: 3, porOpcion: [], ganadora: null, aprobada: null };
    const { cliente, fetchFalso } = conRespuesta(Response.json(resultado));
    expect(await cliente.cerrarPregunta("p1")).toEqual(resultado);
    expect(fetchFalso.mock.calls[0]?.[0]).toBe("/api/mesa/v1/preguntas/p1/cerrar");
  });

  it("palabra: dar con y sin solicitud, terminar, minuto y rechazar", async () => {
    const { cliente, fetchFalso } = conRespuesta(new Response(null, { status: 204 }));
    await cliente.darLaPalabra("s1");
    await cliente.darLaPalabra("s1", "sol-1");
    await cliente.terminarIntervencion("s1");
    await cliente.sumarMinuto("s1");
    await cliente.rechazarMocion("s1", "sol-2");
    expect(fetchFalso.mock.calls.map((c) => c[0])).toEqual([
      "/api/mesa/v1/sesiones/s1/palabra/dar",
      "/api/mesa/v1/sesiones/s1/palabra/dar",
      "/api/mesa/v1/sesiones/s1/palabra/terminar",
      "/api/mesa/v1/sesiones/s1/palabra/minuto",
      "/api/mesa/v1/sesiones/s1/mociones/sol-2/rechazar",
    ]);
    const cuerpos = fetchFalso.mock.calls.map((c) => (c[1] as RequestInit).body);
    expect(JSON.parse(String(cuerpos[0]))).toEqual({});
    expect(JSON.parse(String(cuerpos[1]))).toEqual({ solicitudId: "sol-1" });
  });

  it("un error de la API se vuelve ErrorDeMesa con su mensaje", async () => {
    const { cliente } = conRespuesta(
      Response.json({ error: "CIERRE_OCUPADO", mensaje: "Hay votos entrando" }, { status: 409 }),
    );
    await expect(cliente.cerrarPregunta("p1")).rejects.toMatchObject({
      name: "ErrorDeMesa",
      codigo: "CIERRE_OCUPADO",
      message: "Hay votos entrando",
    });
  });

  it("sin mensaje usa el texto del código, o uno general", async () => {
    const a = conRespuesta(Response.json({ error: "OTRA_PREGUNTA_ABIERTA" }, { status: 409 }));
    await expect(a.cliente.abrirPregunta("p1")).rejects.toThrow(/otra votación abierta/i);
    const b = conRespuesta(Response.json({ error: "RARO" }, { status: 422 }));
    await expect(b.cliente.abrirPregunta("p1")).rejects.toThrow("No se pudo completar");
  });

  it("sin red lanza SIN_CONEXION", async () => {
    const cliente = new ClienteDeMesaPorFetch(async () => {
      throw new TypeError("fallo");
    });
    const error = await cliente.iniciar("s1").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorDeMesa);
    expect(error).toMatchObject({ codigo: "SIN_CONEXION" });
  });

  it("una respuesta 200 que no cumple la forma lanza RESPUESTA_INVALIDA", async () => {
    const { cliente } = conRespuesta(Response.json({ otra: 1 }));
    await expect(cliente.listarSesiones()).rejects.toMatchObject({ codigo: "RESPUESTA_INVALIDA" });
  });
});
