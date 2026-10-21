// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ErrorDeMesa } from "../../src/vistas/mesa/cliente-de-mesa";
import { usePanelDeSesion } from "../../src/vistas/mesa/use-panel-de-sesion";
import { preguntaAbierta, salaVacia } from "../proyeccion/estados";
import { borrador, clienteDeMesaFalso, FuenteRefrescableFalsa } from "./falsos";

afterEach(cleanup);

const SESION = { id: "s1", codigo: "K7F2" };

async function montar(preguntas = [borrador]) {
  const cliente = clienteDeMesaFalso(preguntas);
  const fuente = new FuenteRefrescableFalsa();
  const vista = renderHook(() => usePanelDeSesion(SESION, fuente, cliente));
  await waitFor(() => expect(cliente.listarPreguntas).toHaveBeenCalledTimes(1));
  return { ...vista, cliente, fuente };
}

describe("usePanelDeSesion", () => {
  it("se suscribe al código de la sala y carga las preguntas", async () => {
    const { result, fuente } = await montar();
    expect(fuente.codigo).toBe("K7F2");
    expect(result.current.estado).toBeNull();
    await waitFor(() => expect(result.current.preguntas).toEqual([borrador]));
  });

  it("guarda el estado que llega y recarga las preguntas cuando cambia la versión", async () => {
    const { result, fuente, cliente } = await montar();
    act(() => fuente.alCambiar?.(salaVacia({ version: 1 })));
    await waitFor(() => expect(cliente.listarPreguntas).toHaveBeenCalledTimes(2));
    expect(result.current.estado?.version).toBe(1);
    act(() => fuente.alCambiar?.(salaVacia({ version: 1, asistencia: 5 })));
    expect(cliente.listarPreguntas).toHaveBeenCalledTimes(2);
    act(() => fuente.alCambiar?.(salaVacia({ version: 2 })));
    await waitFor(() => expect(cliente.listarPreguntas).toHaveBeenCalledTimes(3));
  });

  it("avisa sin conexión tras tres consultas seguidas fallidas, y lo quita con una buena", async () => {
    const { result, fuente } = await montar();
    act(() => {
      fuente.alIntentar?.(false);
      fuente.alIntentar?.(false);
    });
    expect(result.current.sinConexion).toBe(false);
    act(() => fuente.alIntentar?.(false));
    expect(result.current.sinConexion).toBe(true);
    act(() => fuente.alIntentar?.(true));
    expect(result.current.sinConexion).toBe(false);
  });

  it("sala inexistente la marca no disponible", async () => {
    const { result, fuente } = await montar();
    act(() => fuente.alNoExistir?.());
    expect(result.current.disponible).toBe(false);
  });

  it("calcula la alerta de votos sobre códigos activados", async () => {
    const { result, fuente } = await montar();
    act(() =>
      fuente.alCambiar?.(
        salaVacia({ asistencia: 3, pregunta: { ...preguntaAbierta(), votosEmitidos: 4 } }),
      ),
    );
    expect(result.current.alerta).toBe(true);
    act(() =>
      fuente.alCambiar?.(
        salaVacia({
          version: 2,
          asistencia: 4,
          pregunta: { ...preguntaAbierta(), votosEmitidos: 4 },
        }),
      ),
    );
    expect(result.current.alerta).toBe(false);
  });

  it("una acción llama al cliente y después refresca preguntas y estado de inmediato", async () => {
    const { result, cliente, fuente } = await montar();
    await act(() => result.current.acciones.abrir("p1"));
    expect(cliente.abrirPregunta).toHaveBeenCalledWith("p1");
    expect(cliente.listarPreguntas).toHaveBeenCalledTimes(2);
    expect(fuente.refrescos).toBe(1);
    expect(result.current.error).toBeUndefined();
  });

  it("cada acción pasa el id de la sesión o de la pregunta que le toca", async () => {
    const { result, cliente } = await montar();
    await act(() => result.current.acciones.iniciar());
    await act(() => result.current.acciones.terminar());
    await act(() => result.current.acciones.cerrar("p1"));
    await act(() => result.current.acciones.anular("p1"));
    await act(() => result.current.acciones.proyectar("p1"));
    await act(() => result.current.acciones.darLaPalabra());
    await act(() => result.current.acciones.darLaPalabra("sol-1"));
    await act(() => result.current.acciones.terminarIntervencion());
    await act(() => result.current.acciones.sumarMinuto());
    await act(() => result.current.acciones.rechazarMocion("sol-2"));
    await act(() => result.current.acciones.crearPregunta("¿Aprueba?", ["Sí", "No"]));
    expect(cliente.iniciar).toHaveBeenCalledWith("s1");
    expect(cliente.terminar).toHaveBeenCalledWith("s1");
    expect(cliente.cerrarPregunta).toHaveBeenCalledWith("p1");
    expect(cliente.anularPregunta).toHaveBeenCalledWith("p1");
    expect(cliente.proyectarPregunta).toHaveBeenCalledWith("p1");
    expect(cliente.darLaPalabra.mock.calls).toEqual([
      ["s1", undefined],
      ["s1", "sol-1"],
    ]);
    expect(cliente.terminarIntervencion).toHaveBeenCalledWith("s1");
    expect(cliente.sumarMinuto).toHaveBeenCalledWith("s1");
    expect(cliente.rechazarMocion).toHaveBeenCalledWith("s1", "sol-2");
    expect(cliente.crearPregunta).toHaveBeenCalledWith("s1", "¿Aprueba?", ["Sí", "No"]);
  });

  it("si la acción falla muestra el mensaje y no refresca", async () => {
    const { result, cliente, fuente } = await montar();
    cliente.abrirPregunta.mockRejectedValueOnce(new ErrorDeMesa(409, "OTRA_PREGUNTA_ABIERTA"));
    let salio = true;
    await act(async () => {
      salio = await result.current.acciones.abrir("p1");
    });
    expect(salio).toBe(false);
    expect(result.current.error?.codigo).toBe("OTRA_PREGUNTA_ABIERTA");
    expect(result.current.error?.mensaje).toMatch(/otra votación abierta/i);
    expect(fuente.refrescos).toBe(0);
  });

  it("CIERRE_OCUPADO se puede reintentar y el error se limpia al salir bien", async () => {
    const { result, cliente } = await montar();
    cliente.cerrarPregunta.mockRejectedValueOnce(
      new ErrorDeMesa(409, "CIERRE_OCUPADO", "Hay votos entrando. Espera unos segundos."),
    );
    await act(() => result.current.acciones.cerrar("p1"));
    expect(result.current.error?.mensaje).toBe("Hay votos entrando. Espera unos segundos.");
    await act(() => result.current.reintentar());
    expect(cliente.cerrarPregunta).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeUndefined();
  });

  it("descartar quita el error", async () => {
    const { result, cliente } = await montar();
    cliente.iniciar.mockRejectedValueOnce(new ErrorDeMesa(0, "SIN_CONEXION"));
    await act(() => result.current.acciones.iniciar());
    expect(result.current.error).toBeDefined();
    act(() => result.current.descartarError());
    expect(result.current.error).toBeUndefined();
  });

  it("no lanza dos acciones a la vez", async () => {
    const { result, cliente } = await montar();
    let liberar!: () => void;
    cliente.iniciar.mockImplementationOnce(() => new Promise<void>((r) => (liberar = r)));
    let primera!: Promise<boolean>;
    act(() => {
      primera = result.current.acciones.iniciar();
    });
    expect(result.current.ocupado).toBe(true);
    let segunda = true;
    await act(async () => {
      segunda = await result.current.acciones.terminar();
    });
    expect(segunda).toBe(false);
    expect(cliente.terminar).not.toHaveBeenCalled();
    await act(async () => {
      liberar();
      await primera;
    });
    expect(result.current.ocupado).toBe(false);
  });

  it("cancela la suscripción al desmontar", async () => {
    const { unmount, fuente } = await montar();
    unmount();
    expect(fuente.canceladas).toBe(1);
  });
});
