import {
  Acta,
  ErrorDeDominio,
  type CodigoDeVerificacion,
  type GeneradorDeCodigos,
  type Reloj,
} from "@kuorum/domain";
import type { RepositorioDeActas } from "../puertos/repositorio-de-actas.js";
import type { RepositorioDeCuerpos } from "../puertos/repositorio-de-cuerpos.js";
import type { RepositorioDeDecisiones } from "../puertos/repositorio-de-decisiones.js";
import type { RepositorioDeInstitucion } from "../puertos/repositorio-de-institucion.js";
import type { RepositorioDeParticipantes } from "../puertos/repositorio-de-participantes.js";
import type { RepositorioDePreguntas } from "../puertos/repositorio-de-preguntas.js";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { RepositorioDeSolicitudes } from "../puertos/repositorio-de-solicitudes.js";
import type { UnidadDeTrabajo } from "../puertos/unidad-de-trabajo.js";
import type { Actor } from "../sala/actor.js";
import { bloquearSesionDeLaMesa } from "../sala/obtener-sesion-de-la-mesa.js";
import { ArmadorDeActa } from "./armador-de-acta.js";

const INTENTOS_DE_CODIGO = 5;

export class FinalizarActa {
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
    private readonly codigos: GeneradorDeCodigos,
    private readonly reloj: Reloj,
    private readonly unidad: UnidadDeTrabajo,
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

  /** El documento final sale del último borrador guardado, no de lo que mande el cliente. */
  async ejecutar(actor: Actor, sesionId: string): Promise<CodigoDeVerificacion> {
    // Otro acta puede tomar el mismo código entre la consulta y la escritura: se repite todo.
    for (let intento = 1; ; intento += 1) {
      try {
        return await this.intentar(actor, sesionId);
      } catch (error) {
        const repetido =
          error instanceof ErrorDeDominio && error.codigo === "CODIGO_DE_VERIFICACION_REPETIDO";
        if (!repetido || intento >= INTENTOS_DE_CODIGO) throw error;
      }
    }
  }

  private intentar(actor: Actor, sesionId: string): Promise<CodigoDeVerificacion> {
    return this.unidad.ejecutar(async () => {
      const sesion = await bloquearSesionDeLaMesa(this.sesiones, actor, sesionId);
      const guardada = await this.actas.deSesion(sesion.id);
      if (guardada?.estado === "FINAL") throw new ErrorDeDominio("ACTA_FINALIZADA");
      sesion.finalizarActa();
      const acta = guardada ?? Acta.borrador(sesion.id);
      const contenido = await this.armador.armar(sesion, acta.desarrollo);
      const codigo = await this.codigoLibre();
      acta.finalizar(contenido, codigo, this.reloj.ahora());
      sesion.registrarCambio();
      await this.actas.guardar(acta);
      await this.sesiones.guardar(sesion);
      return codigo;
    });
  }

  private async codigoLibre(): Promise<CodigoDeVerificacion> {
    for (let intento = 0; intento < INTENTOS_DE_CODIGO; intento += 1) {
      const codigo = this.codigos.codigoDeVerificacion();
      if ((await this.actas.porCodigo(codigo)) === null) return codigo;
    }
    throw new ErrorDeDominio("SIN_CODIGO_DE_VERIFICACION_LIBRE");
  }
}
