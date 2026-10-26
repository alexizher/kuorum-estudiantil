import type { CodigoDeSala, Sesion } from "@kuorum/domain";
import type {
  FiltroDeRango,
  FiltroDeSesiones,
  RepositorioDeSesiones,
} from "../../src/puertos/repositorio-de-sesiones.js";

export class RepositorioDeSesionesEnMemoria implements RepositorioDeSesiones {
  readonly sesiones = new Map<string, Sesion>();
  /**
   * Con true, cada lectura y cada guardado pasan por una copia, como con una base de verdad: lo
   * que un caso de uso cambie sin guardar no se ve al recargar. Por defecto se comparte el objeto.
   */
  copiar = false;

  async porId(id: string): Promise<Sesion | null> {
    const sesion = this.sesiones.get(id);
    return sesion === undefined ? null : this.aislar(sesion);
  }

  porIdBloqueando(id: string): Promise<Sesion | null> {
    return this.porId(id);
  }

  async porCodigoDeSala(codigo: CodigoDeSala): Promise<Sesion | null> {
    for (const sesion of this.sesiones.values()) {
      if (sesion.codigoDeSala.valor === codigo.valor) return this.aislar(sesion);
    }
    return null;
  }

  async guardar(sesion: Sesion): Promise<void> {
    this.sesiones.set(sesion.id, this.aislar(sesion));
  }

  async listar(filtro: FiltroDeSesiones = {}): Promise<Sesion[]> {
    return [...this.sesiones.values()].filter(
      (s) =>
        (filtro.creadaPorId === undefined || s.creadaPorId === filtro.creadaPorId) &&
        (filtro.cuerpoIds === undefined || filtro.cuerpoIds.includes(s.cuerpoId)) &&
        !(filtro.sinCuentaDePrueba === true && s.creadaPorDemo),
    );
  }

  async enRango(desde: Date, hasta: Date, filtro: FiltroDeRango = {}): Promise<Sesion[]> {
    return [...this.sesiones.values()]
      .filter(
        (s) =>
          s.inicio.getTime() < hasta.getTime() &&
          s.fin.getTime() > desde.getTime() &&
          (filtro.cuerpoId === undefined || s.cuerpoId === filtro.cuerpoId) &&
          (!s.creadaPorDemo ||
            (filtro.incluirDe !== undefined && s.creadaPorId === filtro.incluirDe)) &&
          !(filtro.sinCanceladas === true && s.estado === "CANCELADA"),
      )
      .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  }

  async contarDe(creadaPorId: string): Promise<number> {
    return [...this.sesiones.values()].filter((s) => s.creadaPorId === creadaPorId).length;
  }

  private aislar(sesion: Sesion): Sesion {
    return this.copiar ? copia(sesion) : sesion;
  }

  async contarActivasDe(creadaPorId: string): Promise<number> {
    return [...this.sesiones.values()].filter((s) => s.creadaPorId === creadaPorId && s.activa)
      .length;
  }
}

function copia(sesion: Sesion): Sesion {
  return Object.assign(Object.create(Object.getPrototypeOf(sesion) as object) as Sesion, sesion);
}
