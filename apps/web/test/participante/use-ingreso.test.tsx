// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ErrorDeAccion } from "@/vistas/participante/cliente-de-sala";
import { useIngreso } from "@/vistas/participante/use-ingreso";
import { AlmacenEnMemoria, clienteFalso } from "./falsos";

const TOKEN = "3f2b8c1e-6d4a-4b7e-9a1c-0d5e7f8a9b2c";
const generarToken = () => TOKEN;

afterEach(cleanup);

function montar(
  cliente = clienteFalso(),
  almacen = new AlmacenEnMemoria(),
  codigoInicial?: string,
) {
  const vista = renderHook(() =>
    useIngreso("K7F2", cliente, {
      almacen,
      generarToken,
      ...(codigoInicial ? { codigoInicial } : {}),
    }),
  );
  return { ...vista, cliente, almacen };
}

describe("useIngreso", () => {
  it("empieza verificando", () => {
    const cliente = clienteFalso();
    cliente.ingresar.mockReturnValue(new Promise(() => undefined));
    const { result } = montar(cliente);
    expect(result.current.fase).toBe("verificando");
  });

  it("sala abierta: guarda el token, ingresa con él y queda dentro", async () => {
    const { result, cliente, almacen } = montar();
    await waitFor(() => expect(result.current.fase).toBe("dentro"));
    expect(cliente.ingresar).toHaveBeenCalledOnce();
    expect(cliente.ingresar).toHaveBeenCalledWith("K7F2", { tokenNavegador: TOKEN });
    expect(almacen.leer("kuorum-token-K7F2")).toBe(TOKEN);
    expect(almacen.leer("kuorum-ingresado-K7F2")).toBe("1");
  });

  it("reutiliza el token guardado en vez de generar otro", async () => {
    const almacen = new AlmacenEnMemoria();
    almacen.escribir("kuorum-token-K7F2", "guardado-antes");
    const { cliente, result } = montar(clienteFalso(), almacen);
    await waitFor(() => expect(result.current.fase).toBe("dentro"));
    expect(cliente.ingresar).toHaveBeenCalledWith("K7F2", { tokenNavegador: "guardado-antes" });
  });

  it("con códigos y sin cookie pide el código, sin mostrar error", async () => {
    const cliente = clienteFalso();
    cliente.ingresar.mockRejectedValueOnce(new ErrorDeAccion(422, "MODO_REQUIERE_CODIGO"));
    const { result } = montar(cliente);
    await waitFor(() => expect(result.current.fase).toBe("pide-codigo"));
    expect(result.current.error).toBeUndefined();
  });

  it("envía el código escrito en mayúsculas y entra", async () => {
    const cliente = clienteFalso();
    cliente.ingresar.mockRejectedValueOnce(new ErrorDeAccion(422, "MODO_REQUIERE_CODIGO"));
    const { result, almacen } = montar(cliente);
    await waitFor(() => expect(result.current.fase).toBe("pide-codigo"));
    await act(() => result.current.enviarCodigo(" abcd-efgh "));
    expect(cliente.ingresar).toHaveBeenLastCalledWith("K7F2", { codigo: "ABCD-EFGH" });
    expect(result.current.fase).toBe("dentro");
    expect(almacen.leer("kuorum-ingresado-K7F2")).toBe("1");
  });

  it("un código que no es de la sala muestra el mensaje de la API y sigue pidiendo", async () => {
    const cliente = clienteFalso();
    cliente.ingresar.mockRejectedValueOnce(new ErrorDeAccion(422, "MODO_REQUIERE_CODIGO"));
    const { result } = montar(cliente);
    await waitFor(() => expect(result.current.fase).toBe("pide-codigo"));
    cliente.ingresar.mockRejectedValueOnce(
      new ErrorDeAccion(422, "CODIGO_NO_EXISTE", "Ese código no es de esta sala."),
    );
    await act(() => result.current.enviarCodigo("ABCD-EFGH"));
    expect(result.current.fase).toBe("pide-codigo");
    expect(result.current.error).toBe("Ese código no es de esta sala.");
    expect(result.current.enviando).toBe(false);
  });

  it("un código vacío no llama a la API y lo explica", async () => {
    const cliente = clienteFalso();
    cliente.ingresar.mockRejectedValueOnce(new ErrorDeAccion(422, "MODO_REQUIERE_CODIGO"));
    const { result } = montar(cliente);
    await waitFor(() => expect(result.current.fase).toBe("pide-codigo"));
    await act(() => result.current.enviarCodigo("  "));
    expect(cliente.ingresar).toHaveBeenCalledOnce();
    expect(result.current.error).toBe("Escribe el código de acceso.");
  });

  it("?c= entra directo con ese código, una sola vez", async () => {
    const { result, cliente } = montar(clienteFalso(), new AlmacenEnMemoria(), "abcd-efgh");
    await waitFor(() => expect(result.current.fase).toBe("dentro"));
    expect(cliente.ingresar).toHaveBeenCalledOnce();
    expect(cliente.ingresar).toHaveBeenCalledWith("K7F2", { codigo: "ABCD-EFGH" });
  });

  it("?c= que falla deja el formulario con el error y no reintenta solo", async () => {
    const cliente = clienteFalso();
    cliente.ingresar.mockRejectedValue(
      new ErrorDeAccion(422, "CODIGO_NO_EXISTE", "Ese código no es de esta sala."),
    );
    const { result } = montar(cliente, new AlmacenEnMemoria(), "ABCD-EFGH");
    await waitFor(() => expect(result.current.fase).toBe("pide-codigo"));
    expect(result.current.error).toBe("Ese código no es de esta sala.");
    expect(cliente.ingresar).toHaveBeenCalledOnce();
  });

  it("?c= con ingreso ya hecho antes prueba primero la cookie, sin gastar el código", async () => {
    const almacen = new AlmacenEnMemoria();
    almacen.escribir("kuorum-ingresado-K7F2", "1");
    const { result, cliente } = montar(clienteFalso(), almacen, "ABCD-EFGH");
    await waitFor(() => expect(result.current.fase).toBe("dentro"));
    expect(cliente.ingresar).toHaveBeenCalledWith("K7F2", { tokenNavegador: expect.any(String) });
    expect(cliente.ingresar).toHaveBeenCalledOnce();
  });

  it("sala inexistente o terminada", async () => {
    const cliente = clienteFalso();
    cliente.ingresar.mockRejectedValue(
      new ErrorDeAccion(404, "SALA_NO_DISPONIBLE", "Esta sala no existe o ya terminó."),
    );
    const { result } = montar(cliente);
    await waitFor(() => expect(result.current.fase).toBe("no-disponible"));
  });

  it("sin conexión en el intento automático permite reintentar", async () => {
    const cliente = clienteFalso();
    cliente.ingresar.mockRejectedValueOnce(
      new ErrorDeAccion(0, "SIN_CONEXION", "No hay conexión. Revisa tu red e inténtalo de nuevo."),
    );
    const { result } = montar(cliente);
    await waitFor(() => expect(result.current.fase).toBe("no-pudo"));
    expect(result.current.error).toBe("No hay conexión. Revisa tu red e inténtalo de nuevo.");
    await act(() => result.current.reintentar());
    expect(result.current.fase).toBe("dentro");
    expect(result.current.error).toBeUndefined();
  });

  it("perder el ingreso (401) en una sala con códigos borra la marca y vuelve a pedir el código", async () => {
    const cliente = clienteFalso();
    const { result, almacen } = montar(cliente);
    await waitFor(() => expect(result.current.fase).toBe("dentro"));
    cliente.ingresar.mockRejectedValueOnce(new ErrorDeAccion(422, "MODO_REQUIERE_CODIGO"));
    act(() => result.current.perderIngreso());
    await waitFor(() => expect(result.current.fase).toBe("pide-codigo"));
    expect(almacen.leer("kuorum-ingresado-K7F2")).toBeNull();
  });

  it("perder el ingreso en una sala abierta lo recupera con el token, sin pedir nada", async () => {
    const { result, cliente } = montar();
    await waitFor(() => expect(result.current.fase).toBe("dentro"));
    act(() => result.current.perderIngreso());
    await waitFor(() => expect(result.current.fase).toBe("dentro"));
    expect(cliente.ingresar).toHaveBeenCalledTimes(2);
    expect(cliente.ingresar).toHaveBeenLastCalledWith("K7F2", { tokenNavegador: TOKEN });
  });

  it("?c= con ingreso previo y cookie vencida cae al código del QR", async () => {
    const almacen = new AlmacenEnMemoria();
    almacen.escribir("kuorum-ingresado-K7F2", "1");
    const cliente = clienteFalso();
    cliente.ingresar.mockRejectedValueOnce(new ErrorDeAccion(422, "MODO_REQUIERE_CODIGO"));
    const { result } = montar(cliente, almacen, "abcd-efgh");
    await waitFor(() => expect(result.current.fase).toBe("dentro"));
    expect(cliente.ingresar).toHaveBeenCalledTimes(2);
    expect(cliente.ingresar).toHaveBeenLastCalledWith("K7F2", { codigo: "ABCD-EFGH" });
  });

  it("el código del QR no se prueba dos veces", async () => {
    const cliente = clienteFalso();
    cliente.ingresar.mockRejectedValue(
      new ErrorDeAccion(422, "CODIGO_NO_EXISTE", "No es de esta sala."),
    );
    const { result } = montar(cliente, new AlmacenEnMemoria(), "ABCD-EFGH");
    await waitFor(() => expect(result.current.fase).toBe("pide-codigo"));
    cliente.ingresar.mockRejectedValue(new ErrorDeAccion(422, "MODO_REQUIERE_CODIGO"));
    await act(() => result.current.reintentar());
    expect(cliente.ingresar).toHaveBeenCalledTimes(2);
  });

  it("tras un 401 en una sala con códigos el formulario explica que venció", async () => {
    const cliente = clienteFalso();
    const { result } = montar(cliente);
    await waitFor(() => expect(result.current.fase).toBe("dentro"));
    cliente.ingresar.mockRejectedValueOnce(new ErrorDeAccion(422, "MODO_REQUIERE_CODIGO"));
    act(() => result.current.perderIngreso());
    await waitFor(() => expect(result.current.fase).toBe("pide-codigo"));
    expect(result.current.error).toBe("Tu ingreso a la sala venció. Escribe tu código otra vez.");
  });
});
