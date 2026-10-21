import estilos from "./proyeccion.module.css";
import { formatearNumero } from "./textos";

interface Propiedades {
  titulo?: string;
  asistencia: number | null;
}

export function Cabecera({ titulo, asistencia }: Propiedades) {
  if (titulo === undefined && asistencia === null) return null;
  return (
    <header className={estilos.cabecera}>
      {titulo !== undefined ? <p className={estilos.cabeceraSesion}>{titulo}</p> : null}
      {asistencia !== null ? (
        <p className={estilos.cabeceraAsistentes}>
          Asistentes <strong className="num">{formatearNumero(asistencia)}</strong>
        </p>
      ) : null}
    </header>
  );
}
