// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ErrorDeMesa } from "../../src/vistas/mesa/cliente-de-mesa";
import { useSesiones, type DatosDelFormulario } from "../../src/vistas/mesa/use-sesiones";
import { clienteDeMesaFalso, sesionDeLista } from "./falsos";

afterEach(cleanup);

const sesion = sesionDeLista();

const formulario = (cambios: Partial<DatosDelFormulario> = {}): DatosDelFormulario => ({
  titulo: "A",
  modo: "SALA_ABIERTA",
  segundos: 180,
  cuerpoId: "c-g",
  fecha: "2026-11-03",
  desde: "14:00",
  hasta: "16:00",
  modalidad: "PRESENCIAL",
  lugar: "",
  ...cambios,
});

describe("useSesiones", () => {
  it("carga la lista al montar", async () => {
    const cliente = clienteDeMesaFalso();
    cliente.listarSesiones.mockResolvedValue([sesion]);
    const { result } = renderHook(() => useSesiones(cliente));
    expect(result.current.cargando).toBe(true);
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.sesiones).toEqual([sesion]);
  });

  it("ordena de la que empieza más tarde a la que empezó antes", async () => {
    const cliente = clienteDeMesaFalso();
    const vieja = { ...sesion, id: "vieja", inicio: "2026-10-01T10:00:00.000Z" };
    const nueva = { ...sesion, id: "nueva", inicio: "2026-12-20T10:00:00.000Z" };
    cliente.listarSesiones.mockResolvedValue([vieja, nueva]);
    const { result } = renderHook(() => useSesiones(cliente));
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.sesiones.map((s) => s.id)).toEqual(["nueva", "vieja"]);
  });

  it("si la lista falla muestra el mensaje y deja reintentar", async () => {
    const cliente = clienteDeMesaFalso();
    cliente.listarSesiones.mockRejectedValueOnce(new ErrorDeMesa(0, "SIN_CONEXION"));
    const { result } = renderHook(() => useSesiones(cliente));
    await waitFor(() => expect(result.current.error).toMatch(/No hay conexión/));
    await act(() => result.current.recargar());
    expect(result.current.error).toBeUndefined();
  });

  it("crear valida el título, manda los datos y recarga", async () => {
    const cliente = clienteDeMesaFalso();
    const { result } = renderHook(() => useSesiones(cliente));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    let creada = true;
    await act(async () => {
      creada = await result.current.crear(formulario({ titulo: "  " }));
    });
    expect(creada).toBe(false);
    expect(result.current.errorDeCrear).toBe("Escribe el título de la sesión.");
    expect(cliente.crearSesion).not.toHaveBeenCalled();

    await act(async () => {
      creada = await result.current.crear(
        formulario({
          titulo: " Asamblea ",
          modo: "CON_CODIGOS",
          segundos: 120,
          desde: "23:30",
          hasta: "01:00",
          modalidad: "MIXTA",
          lugar: "  Auditorio  ",
        }),
      );
    });
    expect(creada).toBe(true);
    expect(cliente.crearSesion).toHaveBeenCalledWith({
      titulo: "Asamblea",
      modo: "CON_CODIGOS",
      segundosPorIntervencion: 120,
      cuerpoId: "c-g",
      inicio: "2026-11-03T23:30",
      fin: "2026-11-04T01:00",
      modalidad: "MIXTA",
      lugar: "Auditorio",
    });
    expect(cliente.listarSesiones).toHaveBeenCalledTimes(2);
    expect(result.current.errorDeCrear).toBeUndefined();
  });

  it("los segundos fuera de 30 a 900 se rechazan antes de llamar", async () => {
    const cliente = clienteDeMesaFalso();
    const { result } = renderHook(() => useSesiones(cliente));
    await waitFor(() => expect(result.current.cargando).toBe(false));
    await act(() => result.current.crear(formulario({ segundos: 10 })));
    expect(result.current.errorDeCrear).toBe("Los segundos por intervención van de 30 a 900.");
    expect(cliente.crearSesion).not.toHaveBeenCalled();
  });

  it("sin cuerpo o sin fecha y horas se rechaza antes de llamar; sin lugar no lo manda", async () => {
    const cliente = clienteDeMesaFalso();
    const { result } = renderHook(() => useSesiones(cliente));
    await waitFor(() => expect(result.current.cargando).toBe(false));
    await act(() => result.current.crear(formulario({ cuerpoId: "" })));
    expect(result.current.errorDeCrear).toBe("Elige el cuerpo de la sesión.");
    await act(() => result.current.crear(formulario({ desde: "" })));
    expect(result.current.errorDeCrear).toBe("Escribe la fecha y las horas de la sesión.");
    expect(cliente.crearSesion).not.toHaveBeenCalled();
    await act(() => result.current.crear(formulario()));
    expect(cliente.crearSesion.mock.calls[0]?.[0]).not.toHaveProperty("lugar");
  });

  it("un error de la API al crear se muestra", async () => {
    const cliente = clienteDeMesaFalso();
    cliente.crearSesion.mockRejectedValueOnce(new ErrorDeMesa(400, "SOLICITUD_INVALIDA"));
    const { result } = renderHook(() => useSesiones(cliente));
    await waitFor(() => expect(result.current.cargando).toBe(false));
    await act(() => result.current.crear(formulario()));
    expect(result.current.errorDeCrear).toBe("Revisa los datos e inténtalo de nuevo.");
  });

  it("con incluirCuentaDePrueba pide la lista con esa opción y vuelve a pedirla al cambiarla", async () => {
    const cliente = clienteDeMesaFalso();
    const { result, rerender } = renderHook(({ incluir }) => useSesiones(cliente, incluir), {
      initialProps: { incluir: false },
    });
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(cliente.listarSesiones).toHaveBeenLastCalledWith({ incluirCuentaDePrueba: false });

    rerender({ incluir: true });
    await waitFor(() =>
      expect(cliente.listarSesiones).toHaveBeenLastCalledWith({ incluirCuentaDePrueba: true }),
    );
  });
});
