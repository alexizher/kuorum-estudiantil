import type { Sesion } from "@kuorum/domain";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { Actor } from "./actor.js";

export interface OpcionesDeLaLista {
  /** Solo SUPERADMIN: incluye también las sesiones de la cuenta de prueba. */
  incluirCuentaDePrueba?: boolean;
}

/**
 * La cuenta de prueba solo ve sus sesiones. SUPERADMIN ve todas, sin las de la cuenta de prueba
 * (que se llenan de ensayos públicos) salvo que las pida. El personal ve las de sus cuerpos.
 * La de inicio más tardío va primero.
 */
export class ListarSesionesDeLaMesa {
  constructor(private readonly sesiones: RepositorioDeSesiones) {}

  async ejecutar(actor: Actor, opciones: OpcionesDeLaLista = {}): Promise<Sesion[]> {
    return (await this.buscar(actor, opciones)).sort(
      (a, b) => b.inicio.getTime() - a.inicio.getTime(),
    );
  }

  private buscar(actor: Actor, opciones: OpcionesDeLaLista): Promise<Sesion[]> {
    if (actor.rol === "DEMO") return this.sesiones.listar({ creadaPorId: actor.id });
    if (actor.rol === "MESA") {
      if (actor.membresias.length === 0) return Promise.resolve([]);
      return this.sesiones.listar({
        cuerpoIds: actor.membresias.map((m) => m.cuerpoId),
        sinCuentaDePrueba: true,
      });
    }
    return this.sesiones.listar(
      opciones.incluirCuentaDePrueba === true ? {} : { sinCuentaDePrueba: true },
    );
  }
}
