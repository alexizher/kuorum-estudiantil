import Link from "next/link";
import estilos from "./navegacion.module.css";

export interface EnlaceDeNavegacion {
  id: string;
  href: string;
  etiqueta: string;
}

interface Propiedades {
  etiqueta: string;
  enlaces: readonly EnlaceDeNavegacion[];
  /** El id del enlace de la página en la que se está; recibe aria-current="page". */
  actual?: string | undefined;
  className?: string | undefined;
}

/** Fila de secciones: en celular se desplaza de lado y la sección actual lleva una barra debajo. */
export function Navegacion({ etiqueta, enlaces, actual, className }: Propiedades) {
  return (
    <nav aria-label={etiqueta} className={`${estilos.navegacion} ${className ?? ""}`}>
      <ul className={estilos.lista}>
        {enlaces.map((enlace) => (
          <li key={enlace.id}>
            <Link
              href={enlace.href}
              className={estilos.enlace}
              aria-current={enlace.id === actual ? "page" : undefined}
            >
              {enlace.etiqueta}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
