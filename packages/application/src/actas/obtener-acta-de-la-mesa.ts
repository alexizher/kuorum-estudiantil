import type { Acta, ContenidoDeActa } from "@kuorum/domain";
import type { RepositorioDeActas } from "../puertos/repositorio-de-actas.js";
import type { RepositorioDeCuerpos } from "../puertos/repositorio-de-cuerpos.js";
import type { RepositorioDeDecisiones } from "../puertos/repositorio-de-decisiones.js";
import type { RepositorioDeInstitucion } from "../puertos/repositorio-de-institucion.js";
import type { RepositorioDeParticipantes } from "../puertos/repositorio-de-participantes.js";
import type { RepositorioDePreguntas } from "../puertos/repositorio-de-preguntas.js";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { RepositorioDeSolicitudes } from "../puertos/repositorio-de-solicitudes.js";
import type { Actor } from "../sala/actor.js";
import { obtenerSesionDeLaMesa } from "../sala/obtener-sesion-de-la-mesa.js";
import { actaDeLaMesa } from "./acta-de-la-mesa.js";
import { ArmadorDeActa } from "./armador-de-acta.js";

export class ObtenerActaDeLaMesa {
  private readonly armador: ArmadorDeActa;

  constructor(
    private readonly sesiones: RepositorioDeSesiones,
    private readonly actas: RepositorioDeActas,
    cuerpos: RepositorioDeCuerpos,
    institucion: RepositorioDeInstitucion,
    decisiones: RepositorioDeDecisiones,
    preguntas: RepositorioDePreguntas,
    solicitudes: RepositorioDeSolicitudes,
    participantes: RepositorioDeParticipantes,
  ) {
    this.armador = new ArmadorDeActa(
      cuerpos,
      institucion,
      decisiones,
      preguntas,
      solicitudes,
      participantes,
    );
  }

  /** Con el acta final, la vista previa es la foto guardada al finalizar. */
  async ejecutar(
    actor: Actor,
    sesionId: string,
  ): Promise<{ acta: Acta; vistaPrevia: ContenidoDeActa }> {
    const sesion = await obtenerSesionDeLaMesa(this.sesiones, actor, sesionId);
    const acta = await actaDeLaMesa(this.actas, sesion);
    const vistaPrevia = acta.contenido ?? (await this.armador.armar(sesion, acta.desarrollo));
    return { acta, vistaPrevia };
  }
}
