import { deHoraLocal, type Modalidad } from "@kuorum/domain";
import type { RepositorioDeInstitucion } from "../puertos/repositorio-de-institucion.js";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { UnidadDeTrabajo } from "../puertos/unidad-de-trabajo.js";
import { exigirGestionDeSesion } from "./acceso-a-sesion.js";
import type { Actor } from "./actor.js";
import { obtenerSesion } from "./obtener-sesion.js";

export interface CambiosLocales {
  titulo?: string;
  inicioLocal?: string;
  finLocal?: string;
  modalidad?: Modalidad;
  lugar?: string | null;
  ordenDelDia?: string[];
}

export class ReprogramarSesion {
  constructor(
    private readonly sesiones: RepositorioDeSesiones,
    private readonly institucion: RepositorioDeInstitucion,
    private readonly unidad: UnidadDeTrabajo,
  ) {}

  ejecutar(actor: Actor, sesionId: string, cambios: CambiosLocales): Promise<void> {
    return this.unidad.ejecutar(async () => {
      const sesion = await obtenerSesion(this.sesiones, sesionId);
      exigirGestionDeSesion(actor, sesion);
      const { zonaHoraria } = await this.institucion.obtener();
      sesion.reprogramar({
        ...(cambios.titulo === undefined ? {} : { titulo: cambios.titulo }),
        ...(cambios.inicioLocal === undefined
          ? {}
          : { inicio: deHoraLocal(cambios.inicioLocal, zonaHoraria) }),
        ...(cambios.finLocal === undefined
          ? {}
          : { fin: deHoraLocal(cambios.finLocal, zonaHoraria) }),
        ...(cambios.modalidad === undefined ? {} : { modalidad: cambios.modalidad }),
        ...(cambios.lugar === undefined ? {} : { lugar: cambios.lugar }),
        ...(cambios.ordenDelDia === undefined ? {} : { ordenDelDia: cambios.ordenDelDia }),
      });
      sesion.registrarCambio();
      await this.sesiones.guardar(sesion);
    });
  }
}
