import { deHoraLocal } from "@kuorum/domain";
import type { RepositorioDeCuerpos } from "../puertos/repositorio-de-cuerpos.js";
import type { RepositorioDeInstitucion } from "../puertos/repositorio-de-institucion.js";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { Actor } from "../sala/actor.js";
import { resumir, type ResumenDeSesion } from "./resumen-de-sesion.js";

export interface TramoLocal {
  inicioLocal: string;
  finLocal: string;
  /** La sesión que se está reprogramando. */
  excluirId?: string;
}

/** Sesiones de toda la institución que chocan con el tramo. Avisa, no bloquea. */
export class BuscarCruces {
  constructor(
    private readonly sesiones: RepositorioDeSesiones,
    private readonly cuerpos: RepositorioDeCuerpos,
    private readonly institucion: RepositorioDeInstitucion,
  ) {}

  async ejecutar(actor: Actor, tramo: TramoLocal): Promise<ResumenDeSesion[]> {
    const { zonaHoraria } = await this.institucion.obtener();
    const inicio = deHoraLocal(tramo.inicioLocal, zonaHoraria);
    const fin = deHoraLocal(tramo.finLocal, zonaHoraria);
    if (fin.getTime() <= inicio.getTime()) return [];
    const encontradas = await this.sesiones.enRango(inicio, fin, {
      sinCanceladas: true,
      ...(actor.rol === "DEMO" ? { incluirDe: actor.id } : {}),
    });
    return resumir(
      encontradas.filter((s) => s.id !== tramo.excluirId),
      await this.cuerpos.listar(),
    );
  }
}
