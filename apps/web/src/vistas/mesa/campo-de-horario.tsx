import { CampoDeTexto } from "@kuorum/ui";
import estilos from "./mesa.module.css";

interface Propiedades {
  fecha: string;
  desde: string;
  hasta: string;
  alCambiar: (cambios: { fecha?: string; desde?: string; hasta?: string }) => void;
}

/** Fecha y horas en la hora de la institución. Un fin antes del inicio cae al día siguiente. */
export function CamposDeHorario({ fecha, desde, hasta, alCambiar }: Propiedades) {
  return (
    <div className={estilos.horario}>
      <CampoDeTexto
        etiqueta="Fecha"
        type="date"
        value={fecha}
        onChange={(e) => alCambiar({ fecha: e.target.value })}
      />
      <CampoDeTexto
        etiqueta="Desde"
        type="time"
        value={desde}
        onChange={(e) => alCambiar({ desde: e.target.value })}
      />
      <CampoDeTexto
        etiqueta="Hasta"
        type="time"
        value={hasta}
        {...(hasta !== "" && hasta <= desde ? { ayuda: "Termina al día siguiente." } : {})}
        onChange={(e) => alCambiar({ hasta: e.target.value })}
      />
    </div>
  );
}
