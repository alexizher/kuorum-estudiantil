import type { Sesion } from "@kuorum/domain";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { Actor } from "./actor.js";

export interface OpcionesDeLaLista {
  /** Solo SUPERADMIN: incluye también las sesiones de la cuenta de prueba. */
  incluirCuentaDePrueba?: boolean;
}

/**
 * La cuenta de prueba solo ve sus sesiones. SUPERADMIN y MESA ven las demás, sin las de la cuenta
 * de prueba (que se llenan de ensayos públicos); SUPERADMIN puede pedirlas con la opción.
 */
export class ListarSesionesDeLaMesa {
  constructor(private readonly sesiones: RepositorioDeSesiones) {}

  ejecutar(actor: Actor, opciones: OpcionesDeLaLista = {}): Promise<Sesion[]> {
    if (actor.rol === "DEMO") return this.sesiones.listar({ creadaPorId: actor.id });
    const incluir = actor.rol === "SUPERADMIN" && opciones.incluirCuentaDePrueba === true;
    return this.sesiones.listar(incluir ? {} : { sinCuentaDePrueba: true });
  }
}
