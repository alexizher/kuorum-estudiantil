import { SelectorDeTema } from "@kuorum/ui";
import { Navegacion, type EnlaceDeNavegacion } from "./navegacion";
import estilos from "./barra-publica.module.css";

export type SeccionPublica = "inicio" | "calendario" | "decisiones";

const ENLACES: readonly EnlaceDeNavegacion[] = [
  { id: "inicio", href: "/", etiqueta: "Inicio" },
  { id: "calendario", href: "/calendario", etiqueta: "Calendario" },
  { id: "decisiones", href: "/institucion/decisiones", etiqueta: "Decisiones" },
];

/** Barra de las páginas públicas: secciones a la izquierda, tema a la derecha. */
export function BarraPublica({ actual }: { actual: SeccionPublica }) {
  return (
    <header className={estilos.barra}>
      <div className={estilos.interior}>
        <Navegacion etiqueta="Secciones" enlaces={ENLACES} actual={actual} />
        <SelectorDeTema />
      </div>
    </header>
  );
}
