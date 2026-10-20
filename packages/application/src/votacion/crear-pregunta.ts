import { ErrorDeDominio, Pregunta, type GeneradorDeIds } from "@kuorum/domain";
import type { RepositorioDePreguntas } from "../puertos/repositorio-de-preguntas.js";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { UnidadDeTrabajo } from "../puertos/unidad-de-trabajo.js";
import { obtenerSesion } from "../sala/obtener-sesion.js";

export class CrearPregunta {
  constructor(
    private readonly sesiones: RepositorioDeSesiones,
    private readonly preguntas: RepositorioDePreguntas,
    private readonly ids: GeneradorDeIds,
    private readonly unidad: UnidadDeTrabajo,
  ) {}

  ejecutar(sesionId: string, texto: string, opciones: string[]): Promise<Pregunta> {
    return this.unidad.ejecutar(async () => {
      const sesion = await obtenerSesion(this.sesiones, sesionId);
      if (
        sesion.estado !== "PROGRAMADA" &&
        sesion.estado !== "ABIERTA" &&
        sesion.estado !== "EN_CURSO"
      )
        throw new ErrorDeDominio("SESION_NO_DISPONIBLE");
      const pregunta = Pregunta.nueva(sesionId, texto, opciones, this.ids);
      sesion.registrarCambio();
      await this.preguntas.guardar(pregunta);
      await this.sesiones.guardar(sesion);
      return pregunta;
    });
  }
}
