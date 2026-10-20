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
    titulo: string,
    modo: ModoDeParticipacion,
    segundosPorIntervencion?: number,
  ): Promise<Sesion> {
    return this.unidad.ejecutar(async () => {
      for (let intento = 0; intento < INTENTOS_DE_CODIGO; intento += 1) {
        const sesion = Sesion.nueva(
          {
            id: this.ids.nuevo(),
            titulo,
            modo,
            creadaEn: this.reloj.ahora(),
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
