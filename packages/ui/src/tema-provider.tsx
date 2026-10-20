"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { aplicarTema, guardarTema, leerTema, type Tema, type TemaEfectivo } from "./tema.js";

interface ValorDeTema {
  tema: Tema;
  temaEfectivo: TemaEfectivo;
  cambiar: (tema: Tema) => void;
}

const ContextoDeTema = createContext<ValorDeTema | undefined>(undefined);

const CONSULTA_OSCURO = "(prefers-color-scheme: dark)";

export function TemaProvider({ children }: { children: ReactNode }) {
  // Se arranca en "sistema" para que el servidor y el primer render del cliente coincidan.
  const [tema, setTema] = useState<Tema>("sistema");
  const [sistemaOscuro, setSistemaOscuro] = useState(false);

  useEffect(() => {
    const guardado = leerTema();
    setTema(guardado);
    aplicarTema(guardado);
  }, []);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const consulta = window.matchMedia(CONSULTA_OSCURO);
    const leer = () => setSistemaOscuro(consulta.matches);
    leer();
    consulta.addEventListener("change", leer);
    return () => consulta.removeEventListener("change", leer);
  }, []);

  const cambiar = useCallback((nuevo: Tema) => {
    setTema(nuevo);
    aplicarTema(nuevo);
    guardarTema(nuevo);
  }, []);

  const valor = useMemo<ValorDeTema>(
    () => ({
      tema,
      temaEfectivo: tema === "sistema" ? (sistemaOscuro ? "oscuro" : "claro") : tema,
      cambiar,
    }),
    [tema, sistemaOscuro, cambiar],
  );

  return <ContextoDeTema.Provider value={valor}>{children}</ContextoDeTema.Provider>;
}

export function useTema(): ValorDeTema {
  const valor = useContext(ContextoDeTema);
  if (valor === undefined) throw new Error("useTema necesita un TemaProvider");
  return valor;
}
