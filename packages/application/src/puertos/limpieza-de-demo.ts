export interface LimpiezaDeDemo {
  /**
   * Borra las sesiones creadas por usuarios con rol DEMO y todo lo que cuelga de ellas
   * (preguntas, opciones, conteos, votos emitidos, códigos, participantes y solicitudes).
   * Devuelve cuántas sesiones eran.
   */
  eliminarSesionesDeLaCuentaDePrueba(): Promise<number>;
}
