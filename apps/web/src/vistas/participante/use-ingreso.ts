"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Almacen } from "./almacen";
import { comoErrorDeAccion, type ClienteDeSala, type EntradaDeIngreso } from "./cliente-de-sala";

/**
 * verificando: probando si ya hay ingreso. pide-codigo: sala con códigos, falta el código.
 * no-pudo: el intento automático falló por la red; se puede reintentar.
 */
export type FaseDeIngreso = "verificando" | "pide-codigo" | "dentro" | "no-disponible" | "no-pudo";

export interface OpcionesDeIngreso {
  almacen: Almacen;
  /** Código que vino en `?c=` (el QR de la mesa). */
  codigoInicial?: string;
  generarToken?: () => string;
}

export interface Ingreso {
  fase: FaseDeIngreso;
  error: string | undefined;
  enviando: boolean;
  enviarCodigo: (texto: string) => Promise<void>;
  reintentar: () => Promise<void>;
  /** Una acción devolvió 401: la cookie venció. */
  perderIngreso: () => void;
}

const normalizar = (texto: string) => texto.trim().toUpperCase();

export function useIngreso(
  codigo: string,
  cliente: ClienteDeSala,
  { almacen, codigoInicial, generarToken = () => crypto.randomUUID() }: OpcionesDeIngreso,
): Ingreso {
  const [fase, setFase] = useState<FaseDeIngreso>("verificando");
  const [error, setError] = useState<string | undefined>(undefined);
  const [enviando, setEnviando] = useState(false);
  const arrancado = useRef(false);

  const claveDelToken = `kuorum-token-${codigo}`;
  const claveDeIngreso = `kuorum-ingresado-${codigo}`;

  const intentar = useCallback(
    async (entrada: EntradaDeIngreso): Promise<void> => {
      setEnviando(true);
      try {
        await cliente.ingresar(codigo, entrada);
        almacen.escribir(claveDeIngreso, "1");
        setError(undefined);
        setFase("dentro");
      } catch (causa) {
        const fallo = comoErrorDeAccion(causa);
        const conCodigo = "codigo" in entrada;
        if (fallo.codigo === "SALA_NO_DISPONIBLE") {
          setFase("no-disponible");
        } else if (!conCodigo && fallo.codigo === "MODO_REQUIERE_CODIGO") {
          setError(undefined);
          setFase("pide-codigo");
        } else if (!conCodigo) {
          setError(fallo.message);
          setFase("no-pudo");
        } else {
          setError(fallo.message);
          setFase("pide-codigo");
        }
      } finally {
        setEnviando(false);
      }
    },
    [almacen, claveDeIngreso, cliente, codigo],
  );

  const conElToken = useCallback((): Promise<void> => {
    let token = almacen.leer(claveDelToken);
    if (token === null) {
      token = generarToken();
      almacen.escribir(claveDelToken, token);
    }
    return intentar({ tokenNavegador: token });
  }, [almacen, claveDelToken, generarToken, intentar]);

  useEffect(() => {
    if (arrancado.current) return;
    arrancado.current = true;
    const yaIngreso = almacen.leer(claveDeIngreso) === "1";
    if (codigoInicial !== undefined && codigoInicial !== "" && !yaIngreso) {
      void intentar({ codigo: normalizar(codigoInicial) });
    } else {
      void conElToken();
    }
  }, [almacen, claveDeIngreso, codigoInicial, conElToken, intentar]);

  const enviarCodigo = useCallback(
    async (texto: string): Promise<void> => {
      const limpio = normalizar(texto);
      if (limpio === "") {
        setError("Escribe el código de acceso.");
        return;
      }
      await intentar({ codigo: limpio });
    },
    [intentar],
  );

  const reintentar = useCallback(async (): Promise<void> => {
    setError(undefined);
    setFase("verificando");
    await conElToken();
  }, [conElToken]);

  const perderIngreso = useCallback((): void => {
    almacen.borrar(claveDeIngreso);
    setError(undefined);
    setFase("verificando");
    // En una sala abierta el token basta para recuperar la cookie sin molestar a nadie.
    void conElToken();
  }, [almacen, claveDeIngreso, conElToken]);

  return { fase, error, enviando, enviarCodigo, reintentar, perderIngreso };
}
