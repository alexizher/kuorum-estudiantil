"use client";

import { siguienteTema } from "./tema.js";
import { useTema } from "./tema-provider.js";

function Sol() {
  return (
    <svg className="tema__sol" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6 13 13M3 13l1.4-1.4M11.6 4.4 13 3" />
    </svg>
  );
}

function Luna() {
  return (
    <svg className="tema__luna" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M13.5 9.6A5.8 5.8 0 0 1 6.4 2.5a5.8 5.8 0 1 0 7.1 7.1Z" />
    </svg>
  );
}

/**
 * Interruptor de tema oscuro. Sin preferencia guardada sigue al sistema; la posición de la perilla
 * y el ícono salen del CSS (data-tema y prefers-color-scheme), así no parpadea al cargar.
 */
export function SelectorDeTema() {
  const { temaEfectivo, temaDelSistema, cambiar } = useTema();
  const oscuro = temaEfectivo === "oscuro";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={oscuro}
      aria-label="Tema oscuro"
      title={oscuro ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      className="tema"
      onClick={() => cambiar(siguienteTema(temaEfectivo, temaDelSistema))}
    >
      <span className="tema__riel" aria-hidden="true">
        <span className="tema__perilla">
          <Sol />
          <Luna />
        </span>
      </span>
    </button>
  );
}
