import { CodigoDeVerificacion, ErrorDeDominio } from "@kuorum/domain";
import type { RepositorioDeActas } from "../puertos/repositorio-de-actas.js";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import { actaPublicaDeSesion } from "./obtener-acta-publica.js";

export interface ResumenDeActaVerificada {
  sesionId: string;
  codigo: string;
  finalizadaEn: Date;
  institucion: string;
  cuerpo: string;
  titulo: string;
  inicio: string;
  zonaHoraria: string;
}

function leerCodigo(texto: string): CodigoDeVerificacion | null {
  try {
    return CodigoDeVerificacion.crear(texto);
  } catch (error) {
    if (error instanceof ErrorDeDominio) return null;
    throw error;
  }
}

/** Acepta minúsculas, espacios y el código sin guion. Lo que no existe o no es público es null. */
export class VerificarActa {
  constructor(
    private readonly actas: RepositorioDeActas,
    private readonly sesiones: RepositorioDeSesiones,
  ) {}

  async ejecutar(texto: string): Promise<ResumenDeActaVerificada | null> {
    const codigo = leerCodigo(texto);
    if (codigo === null) return null;
    const encontrada = await this.actas.porCodigo(codigo);
    if (encontrada === null) return null;
    const publica = await actaPublicaDeSesion(this.actas, this.sesiones, encontrada.sesionId);
    const contenido = publica?.acta.contenido;
    const finalizadaEn = publica?.acta.finalizadaEn;
    if (publica === null || !contenido || !finalizadaEn) return null;
    return {
      sesionId: publica.sesion.id,
      codigo: codigo.valor,
      finalizadaEn,
      institucion: contenido.institucion,
      cuerpo: contenido.cuerpo,
      titulo: contenido.titulo,
      inicio: contenido.inicio,
      zonaHoraria: contenido.zonaHoraria,
    };
  }
}
