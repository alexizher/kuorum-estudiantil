"use client";

import { Boton, SelectorDeTema } from "@kuorum/ui";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import estilos from "./proyeccion.module.css";

const OCULTAR_TRAS_MS = 3000;

function suscribirAPantallaCompleta(alCambiar: () => void): () => void {
  document.addEventListener("fullscreenchange", alCambiar);
  return () => document.removeEventListener("fullscreenchange", alCambiar);
}
const enPantallaCompleta = () => Boolean(document.fullscreenElement);
const sinPantallaCompleta = () => false;

/** Tema y pantalla completa; se esconden tras 3 s sin mover el mouse. */
export function ControlesDeProyeccion() {
  const [visible, setVisible] = useState(true);
  const [conFoco, setConFoco] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const completa = useSyncExternalStore(
    suscribirAPantallaCompleta,
    enPantallaCompleta,
    sinPantallaCompleta,
  );
  const [disponible, setDisponible] = useState(false);

  const mostrar = useCallback(() => {
    setVisible(true);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setVisible(false), OCULTAR_TRAS_MS);
  }, []);

  useEffect(() => {
    setDisponible(typeof document.documentElement.requestFullscreen === "function");
    mostrar();
    document.addEventListener("mousemove", mostrar);
    return () => {
      document.removeEventListener("mousemove", mostrar);
      clearTimeout(temporizador.current);
    };
  }, [mostrar]);

  const alternar = () => {
    const accion = completa
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen();
    accion.catch(() => undefined);
  };

  return (
    <div
      className={estilos.controles}
      role="group"
      aria-label="Controles de la proyección"
      data-visible={visible || conFoco ? "true" : "false"}
      onFocus={() => setConFoco(true)}
      onBlur={() => {
        setConFoco(false);
        mostrar();
      }}
    >
      <SelectorDeTema />
      {disponible ? (
        <Boton onClick={alternar}>
          {completa ? "Salir de pantalla completa" : "Pantalla completa"}
        </Boton>
      ) : null}
    </div>
  );
}
