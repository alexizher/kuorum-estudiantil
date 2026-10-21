import estilos from "./mesa.module.css";

/** Aviso en la cabecera de la mesa cuando quien opera es la cuenta de prueba pública. */
export function InsigniaDeCuentaDePrueba() {
  return <span className={estilos.insigniaDeDemo}>Cuenta de prueba</span>;
}
