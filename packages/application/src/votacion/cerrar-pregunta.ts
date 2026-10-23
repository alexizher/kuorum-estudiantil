import {
  Decision,
  Resultado,
  type GeneradorDeIds,
  type RegistroDeVotos,
  type Reloj,
} from "@kuorum/domain";
import type { RepositorioDeDecisiones } from "../puertos/repositorio-de-decisiones.js";
import type { RepositorioDeParticipantes } from "../puertos/repositorio-de-participantes.js";
import type { RepositorioDePreguntas } from "../puertos/repositorio-de-preguntas.js";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { UnidadDeTrabajo } from "../puertos/unidad-de-trabajo.js";
import type { Actor } from "../sala/actor.js";
import { obtenerPreguntaDeLaMesa } from "./obtener-pregunta.js";

/** Cierra la votación y deja su decisión en la misma unidad de trabajo. */
export class CerrarPregunta {
  constructor(
    private readonly preguntas: RepositorioDePreguntas,
    private readonly sesiones: RepositorioDeSesiones,
    private readonly votos: RegistroDeVotos,
    private readonly reloj: Reloj,
    private readonly unidad: UnidadDeTrabajo,
    private readonly decisiones: RepositorioDeDecisiones,
    private readonly participantes: RepositorioDeParticipantes,
    private readonly ids: GeneradorDeIds,
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
      const resultado = Resultado.calcular(pregunta, await this.votos.conteos(pregunta.id));
      const asistentes =
        sesion.modo === "CON_CODIGOS" ? await this.participantes.contarActivos(sesion.id) : null;
      await this.decisiones.guardar(
        Decision.desdeResultado({
          id: this.ids.nuevo(),
          pregunta,
          sesion,
          resultado,
          asistentes,
          cerradaEn: pregunta.cerradaEn ?? this.reloj.ahora(),
        }),
      );
      return resultado;
    });
  }
}
