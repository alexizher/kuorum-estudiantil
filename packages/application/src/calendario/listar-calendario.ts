import { ErrorDeDominio, type Cuerpo, type Institucion } from "@kuorum/domain";
import type { RepositorioDeCuerpos } from "../puertos/repositorio-de-cuerpos.js";
import type { RepositorioDeInstitucion } from "../puertos/repositorio-de-institucion.js";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import { resumir, type ResumenDeSesion } from "./resumen-de-sesion.js";

/** Lo más largo que se puede pedir de una vez, también desde la API pública y el `.ics`. */
export const DIAS_MAXIMOS_DEL_CALENDARIO = 400;
const RANGO_MAXIMO_MS = DIAS_MAXIMOS_DEL_CALENDARIO * 86_400_000;

export interface Calendario {
  institucion: Institucion;
  cuerpos: Cuerpo[];
  sesiones: ResumenDeSesion[];
}

/** Público: sin las sesiones de la cuenta de prueba; las canceladas salen para tacharlas. */
export class ListarCalendario {
  constructor(
    private readonly sesiones: RepositorioDeSesiones,
    private readonly cuerpos: RepositorioDeCuerpos,
    private readonly institucion: RepositorioDeInstitucion,
  ) {}

  async ejecutar(consulta: { desde: Date; hasta: Date; cuerpoSlug?: string }): Promise<Calendario> {
    const rango = consulta.hasta.getTime() - consulta.desde.getTime();
    if (!(rango > 0 && rango <= RANGO_MAXIMO_MS)) throw new ErrorDeDominio("RANGO_INVALIDO");
    let cuerpoId: string | undefined;
    if (consulta.cuerpoSlug !== undefined) {
      const cuerpo = await this.cuerpos.porSlug(consulta.cuerpoSlug);
      if (cuerpo === null) throw new ErrorDeDominio("CUERPO_NO_EXISTE");
      cuerpoId = cuerpo.id;
    }
    const cuerpos = await this.cuerpos.listar();
    const sesiones = await this.sesiones.enRango(
      consulta.desde,
      consulta.hasta,
      cuerpoId === undefined ? {} : { cuerpoId },
    );
    return {
      institucion: await this.institucion.obtener(),
      cuerpos,
      sesiones: resumir(sesiones, cuerpos),
    };
  }
}
