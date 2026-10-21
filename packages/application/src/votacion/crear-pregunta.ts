import { ErrorDeDominio, Pregunta, type GeneradorDeIds } from "@kuorum/domain";
import type { RepositorioDePreguntas } from "../puertos/repositorio-de-preguntas.js";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { UnidadDeTrabajo } from "../puertos/unidad-de-trabajo.js";
import { MAXIMO_DE_PREGUNTAS_POR_SESION_DE_DEMO } from "../sala/limites-de-demo.js";
import type { Actor } from "../sala/actor.js";
import { obtenerSesionDeLaMesa } from "../sala/obtener-sesion-de-la-mesa.js";

export class CrearPregunta {
  constructor(
    private readonly sesiones: RepositorioDeSesiones,
    private readonly preguntas: RepositorioDePreguntas,
    private readonly ids: GeneradorDeIds,
    private readonly unidad: UnidadDeTrabajo,
  ) {}

  ejecutar(actor: Actor, sesionId: string, texto: string, opciones: string[]): Promise<Pregunta> {
    return this.unidad.ejecutar(async () => {
      const sesion = await obtenerSesionDeLaMesa(this.sesiones, actor, sesionId);
      if (
        sesion.estado !== "PROGRAMADA" &&
        sesion.estado !== "ABIERTA" &&
        sesion.estado !== "EN_CURSO"
      )
        throw new ErrorDeDominio("SESION_NO_DISPONIBLE");
      if (
        actor.rol === "DEMO" &&
        (await this.preguntas.deSesion(sesion.id)).length >= MAXIMO_DE_PREGUNTAS_POR_SESION_DE_DEMO
      ) {
        throw new ErrorDeDominio("LIMITE_DE_PREGUNTAS_DE_DEMO");
      }
      const pregunta = Pregunta.nueva(sesionId, texto, opciones, this.ids);
      sesion.registrarCambio();
      await this.preguntas.guardar(pregunta);
      await this.sesiones.guardar(sesion);
      return pregunta;
    });
  }
}
