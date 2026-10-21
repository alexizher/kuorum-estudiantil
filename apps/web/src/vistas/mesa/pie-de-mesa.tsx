import { SelectorDeTema } from "@kuorum/ui";
import estilos from "./mesa.module.css";

/** Pie de las pantallas de la mesa: el selector de tema, fuera del camino de las acciones. */
export function PieDeMesa() {
  return (
    <footer role="contentinfo" className={`${estilos.pie} ${estilos.noImprimir}`}>
      <SelectorDeTema />
    </footer>
  );
}
