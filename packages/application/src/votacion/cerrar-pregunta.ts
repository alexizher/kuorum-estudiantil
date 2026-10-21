import { Resultado, type RegistroDeVotos, type Reloj } from "@kuorum/domain";
import type { RepositorioDePreguntas } from "../puertos/repositorio-de-preguntas.js";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { UnidadDeTrabajo } from "../puertos/unidad-de-trabajo.js";
import type { Actor } from "../sala/actor.js";
import { obtenerPreguntaDeLaMesa } from "./obtener-pregunta.js";

export class CerrarPregunta {
  constructor(
    private readonly preguntas: RepositorioDePreguntas,
    private readonly sesiones: RepositorioDeSesiones,
    private readonly votos: RegistroDeVotos,
    private readonly reloj: Reloj,
    private readonly unidad: UnidadDeTrabajo,
  ) {}

  ejecutar(actor: Actor, preguntaId: string): Promise<Resultado> {
    return this.unidad.ejecutar(async () => {
      const { pregunta, sesion } = await obtenerPreguntaDeLaMesa(
        this.preguntas,
        this.sesiones,
        actor,
        preguntaId,
      );
      pregunta.cerrar(this.reloj);
      sesion.registrarCambio();
      await this.preguntas.guardar(pregunta);
      await this.sesiones.guardar(sesion);
      return Resultado.calcular(pregunta, await this.votos.conteos(pregunta.id));
    });
  }
}
