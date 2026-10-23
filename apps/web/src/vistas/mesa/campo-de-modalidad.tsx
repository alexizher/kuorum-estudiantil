import type { Modalidad } from "./cliente-de-mesa";
import estilos from "./mesa.module.css";
import { ETIQUETA_DE_MODALIDAD } from "./textos";

const MODALIDADES: readonly Modalidad[] = ["PRESENCIAL", "VIRTUAL", "MIXTA"];

export function CampoDeModalidad({
  valor,
  nombre,
  alCambiar,
}: {
  valor: Modalidad;
  nombre: string;
  alCambiar: (modalidad: Modalidad) => void;
}) {
  return (
    <fieldset className={`${estilos.conjunto} ${estilos.enLinea}`}>
      <legend>Modalidad</legend>
      {MODALIDADES.map((opcion) => (
        <label className={estilos.radio} key={opcion}>
          <input
            type="radio"
            name={nombre}
            value={opcion}
            checked={valor === opcion}
            onChange={() => alCambiar(opcion)}
          />
          <span>{ETIQUETA_DE_MODALIDAD[opcion]}</span>
        </label>
      ))}
    </fieldset>
  );
}
