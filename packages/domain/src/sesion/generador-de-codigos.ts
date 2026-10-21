import type { CodigoDeAcceso } from "./codigo-de-acceso.js";
import type { CodigoDeSala } from "./codigo-de-sala.js";

export interface GeneradorDeCodigos {
  codigoDeSala(): CodigoDeSala;
  codigoDeAcceso(): CodigoDeAcceso;
}
