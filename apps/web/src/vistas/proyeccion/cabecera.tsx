import estilos from "./proyeccion.module.css";
import { formatearNumero } from "./textos";

interface Propiedades {
  titulo?: string;
  asistencia: number | null;
}

export function Cabecera({ titulo, asistencia }: Propiedades) {
  return (
    <header className={estilos.cabecera}>
      <p className={estilos.cabeceraSesion}>{titulo}</p>
      {asistencia !== null ? (
        <p className={estilos.cabeceraAsistentes}>
          Asistentes <strong className="num">{formatearNumero(asistencia)}</strong>
        </p>
      ) : null}
    </header>
  );
}
