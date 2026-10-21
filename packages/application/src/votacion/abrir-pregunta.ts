import { ErrorDeDominio, type Reloj } from "@kuorum/domain";
import type { RepositorioDePreguntas } from "../puertos/repositorio-de-preguntas.js";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { UnidadDeTrabajo } from "../puertos/unidad-de-trabajo.js";
import { obtenerSesion } from "../sala/obtener-sesion.js";
import { obtenerPregunta } from "./obtener-pregunta.js";

export class AbrirPregunta {
  constructor(
    private readonly sesiones: RepositorioDeSesiones,
    private readonly preguntas: RepositorioDePreguntas,
    private readonly reloj: Reloj,
    private readonly unidad: UnidadDeTrabajo,
  ) {}

  ejecutar(preguntaId: string): Promise<void> {
    return this.unidad.ejecutar(async () => {
      const pregunta = await obtenerPregunta(this.preguntas, preguntaId);
      const sesion = await obtenerSesion(this.sesiones, pregunta.sesionId);
      sesion.exigirEnCurso();
      const abierta = await this.preguntas.abiertaDeSesion(sesion.id);
      if (abierta !== null && abierta.id !== pregunta.id) {
        throw new ErrorDeDominio("OTRA_PREGUNTA_ABIERTA");
      }
      pregunta.abrir(this.reloj);
      sesion.registrarCambio();
      await this.preguntas.guardar(pregunta);
      await this.sesiones.guardar(sesion);
    });
  }
}
