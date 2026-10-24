import type { ReactNode } from "react";
import { Navegacion, type EnlaceDeNavegacion } from "@/components/navegacion";
import estilos from "./mesa.module.css";

export type SeccionDeMesa = "sesiones" | "institucion" | "personal" | "cuenta";

interface Propiedades {
  titulo: string;
  actual: SeccionDeMesa;
  /** SUPERADMIN: ve Institución y Personal. */
  esAdministrador?: boolean;
  /** La cuenta de prueba no tiene "Mi cuenta". */
  esDemo?: boolean;
  /** Botones a la derecha del título (salir, insignia de la cuenta de prueba). */
  acciones?: ReactNode;
}

function enlacesDeMesa(esAdministrador: boolean, esDemo: boolean): EnlaceDeNavegacion[] {
  return [
    { id: "sesiones", href: "/mesa", etiqueta: "Sesiones" },
    ...(esAdministrador
      ? [
          { id: "institucion", href: "/mesa/institucion", etiqueta: "Institución" },
          { id: "personal", href: "/mesa/personal", etiqueta: "Personal" },
        ]
      : []),
    ...(esDemo ? [] : [{ id: "cuenta", href: "/mesa/cuenta", etiqueta: "Mi cuenta" }]),
    { id: "calendario", href: "/calendario", etiqueta: "Calendario" },
  ];
}

/** Cabecera de las secciones de la mesa: título, acciones y la misma fila de secciones en todas. */
export function CabeceraDeMesa({
  titulo,
  actual,
  esAdministrador = false,
  esDemo = false,
  acciones,
}: Propiedades) {
  return (
    <header role="banner" className={estilos.cabeceraDeMesa}>
      <div className={estilos.filaDeMesa}>
        <h1 className={`titular ${estilos.tituloDeMesa}`}>{titulo}</h1>
        {acciones ? <div className={estilos.accionesDeCabecera}>{acciones}</div> : null}
      </div>
      <Navegacion
        etiqueta="Secciones de la mesa"
        enlaces={enlacesDeMesa(esAdministrador, esDemo)}
        actual={actual}
        className={estilos.seccionesDeMesa}
      />
    </header>
  );
}
