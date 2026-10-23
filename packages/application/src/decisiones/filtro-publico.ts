import { ErrorDeDominio } from "@kuorum/domain";
import { DIAS_MAXIMOS_DEL_CALENDARIO } from "../calendario/listar-calendario.js";
import type { RepositorioDeCuerpos } from "../puertos/repositorio-de-cuerpos.js";
import type { FiltroPublico } from "../puertos/repositorio-de-decisiones.js";

const RANGO_MAXIMO_MS = DIAS_MAXIMOS_DEL_CALENDARIO * 86_400_000;

export interface ConsultaPublica {
  desde: Date;
  hasta: Date;
  cuerpoSlug?: string;
}

/** Valida el rango como el calendario y traduce el slug del cuerpo a su id. */
export async function filtroPublico(
  cuerpos: RepositorioDeCuerpos,
  consulta: ConsultaPublica,
): Promise<FiltroPublico> {
  const rango = consulta.hasta.getTime() - consulta.desde.getTime();
  if (!(rango > 0 && rango <= RANGO_MAXIMO_MS)) throw new ErrorDeDominio("RANGO_INVALIDO");
  const filtro: FiltroPublico = { desde: consulta.desde, hasta: consulta.hasta };
  if (consulta.cuerpoSlug === undefined) return filtro;
  const cuerpo = await cuerpos.porSlug(consulta.cuerpoSlug);
  if (cuerpo === null) throw new ErrorDeDominio("CUERPO_NO_EXISTE");
  return { ...filtro, cuerpoId: cuerpo.id };
}
