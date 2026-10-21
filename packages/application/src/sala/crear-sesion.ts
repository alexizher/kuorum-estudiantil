import {
  ErrorDeDominio,
  Sesion,
  type GeneradorDeCodigos,
  type GeneradorDeIds,
  type ModoDeParticipacion,
  type Reloj,
} from "@kuorum/domain";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { UnidadDeTrabajo } from "../puertos/unidad-de-trabajo.js";
import type { Actor } from "./actor.js";
import { LIMITE_DE_SESIONES_ACTIVAS_DE_DEMO } from "./limites-de-demo.js";

const INTENTOS_DE_CODIGO = 5;

export class CrearSesion {
  constructor(
    private readonly sesiones: RepositorioDeSesiones,
    private readonly unidad: UnidadDeTrabajo,
    private readonly ids: GeneradorDeIds,
    private readonly reloj: Reloj,
    private readonly codigos: GeneradorDeCodigos,
  ) {}

  ejecutar(
    actor: Actor,
    titulo: string,
    modo: ModoDeParticipacion,
    segundosPorIntervencion?: number,
  ): Promise<Sesion> {
    return this.unidad.ejecutar(async () => {
      if (
        actor.rol === "DEMO" &&
        (await this.sesiones.contarActivasDe(actor.id)) >= LIMITE_DE_SESIONES_ACTIVAS_DE_DEMO
      ) {
        throw new ErrorDeDominio("LIMITE_DE_DEMO");
      }
      for (let intento = 0; intento < INTENTOS_DE_CODIGO; intento += 1) {
        const sesion = Sesion.nueva(
          {
            id: this.ids.nuevo(),
            titulo,
            modo,
            creadaEn: this.reloj.ahora(),
            creadaPorId: actor.id,
            ...(segundosPorIntervencion === undefined ? {} : { segundosPorIntervencion }),
          },
          this.codigos,
        );
        if ((await this.sesiones.porCodigoDeSala(sesion.codigoDeSala)) === null) {
          await this.sesiones.guardar(sesion);
          return sesion;
        }
      }
      throw new ErrorDeDominio("SIN_CODIGO_DE_SALA_LIBRE");
    });
  }
}
