import { ErrorDeDominio, type Acta, type Sesion } from "@kuorum/domain";
import type { RepositorioDeActas } from "../puertos/repositorio-de-actas.js";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";

export interface ActaPublica {
  acta: Acta;
  sesion: Sesion;
}

/** Null si no es pública: borrador, sesión sin acta final o creada por la cuenta de prueba. */
export async function actaPublicaDeSesion(
  actas: RepositorioDeActas,
  sesiones: RepositorioDeSesiones,
  sesionId: string,
): Promise<ActaPublica | null> {
  const acta = await actas.deSesion(sesionId);
  if (acta === null || acta.estado !== "FINAL") return null;
  const sesion = await sesiones.porId(sesionId);
  if (sesion === null || sesion.estado !== "ACTA_FINAL" || sesion.creadaPorDemo) return null;
  return { acta, sesion };
}

/** El id es el de la sesión: hay un acta por sesión. */
export class ObtenerActaPublica {
  constructor(
    private readonly actas: RepositorioDeActas,
    private readonly sesiones: RepositorioDeSesiones,
  ) {}

  async ejecutar(sesionId: string): Promise<ActaPublica> {
    const publica = await actaPublicaDeSesion(this.actas, this.sesiones, sesionId);
    if (publica === null) throw new ErrorDeDominio("ACTA_NO_ENCONTRADA");
    return publica;
  }
}
