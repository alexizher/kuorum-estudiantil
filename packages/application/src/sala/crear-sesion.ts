import {
  ErrorDeDominio,
  Sesion,
  deHoraLocal,
  type GeneradorDeCodigos,
  type GeneradorDeIds,
  type Modalidad,
  type ModoDeParticipacion,
  type Reloj,
} from "@kuorum/domain";
import { puedeProgramarEn } from "../institucion/permisos.js";
import type { RepositorioDeCuerpos } from "../puertos/repositorio-de-cuerpos.js";
import type { RepositorioDeInstitucion } from "../puertos/repositorio-de-institucion.js";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { UnidadDeTrabajo } from "../puertos/unidad-de-trabajo.js";
import type { Actor } from "./actor.js";
import {
  LIMITE_DE_SESIONES_ACTIVAS_DE_DEMO,
  MAXIMO_DE_SESIONES_DE_DEMO,
} from "./limites-de-demo.js";

const INTENTOS_DE_CODIGO = 5;

export interface DatosParaCrearSesion {
  titulo: string;
  modo: ModoDeParticipacion;
  segundosPorIntervencion?: number;
  cuerpoId: string;
  /** Hora local de la institución, `2026-11-03T14:00`. */
  inicioLocal: string;
  finLocal: string;
  modalidad: Modalidad;
  lugar?: string | null;
}

export class CrearSesion {
  constructor(
    private readonly sesiones: RepositorioDeSesiones,
    private readonly cuerpos: RepositorioDeCuerpos,
    private readonly institucion: RepositorioDeInstitucion,
    private readonly unidad: UnidadDeTrabajo,
    private readonly ids: GeneradorDeIds,
    private readonly reloj: Reloj,
    private readonly codigos: GeneradorDeCodigos,
  ) {}

  ejecutar(actor: Actor, datos: DatosParaCrearSesion): Promise<Sesion> {
    return this.unidad.ejecutar(async () => {
      const cuerpo = await this.cuerpos.porId(datos.cuerpoId);
      if (cuerpo === null || !puedeProgramarEn(actor, cuerpo)) {
        throw new ErrorDeDominio("CUERPO_AJENO");
      }
      const { zonaHoraria } = await this.institucion.obtener();
      const inicio = deHoraLocal(datos.inicioLocal, zonaHoraria);
      const fin = deHoraLocal(datos.finLocal, zonaHoraria);
      if (
        actor.rol === "DEMO" &&
        (await this.sesiones.contarActivasDe(actor.id)) >= LIMITE_DE_SESIONES_ACTIVAS_DE_DEMO
      ) {
        throw new ErrorDeDominio("LIMITE_DE_DEMO");
      }
      if (
        actor.rol === "DEMO" &&
        (await this.sesiones.contarDe(actor.id)) >= MAXIMO_DE_SESIONES_DE_DEMO
      ) {
        throw new ErrorDeDominio("LIMITE_DE_SESIONES_DE_DEMO");
      }
      for (let intento = 0; intento < INTENTOS_DE_CODIGO; intento += 1) {
        const sesion = Sesion.nueva(
          {
            id: this.ids.nuevo(),
            titulo: datos.titulo,
            modo: datos.modo,
            creadaEn: this.reloj.ahora(),
            creadaPorId: actor.id,
            creadaPorDemo: actor.rol === "DEMO",
            cuerpoId: cuerpo.id,
            inicio,
            fin,
            modalidad: datos.modalidad,
            lugar: datos.lugar ?? null,
            ...(datos.segundosPorIntervencion === undefined
              ? {}
              : { segundosPorIntervencion: datos.segundosPorIntervencion }),
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
