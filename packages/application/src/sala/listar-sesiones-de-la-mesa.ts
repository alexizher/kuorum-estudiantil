import type { Sesion } from "@kuorum/domain";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { Actor } from "./actor.js";

/** La cuenta de prueba solo ve sus sesiones; SUPERADMIN y MESA ven todas. */
export class ListarSesionesDeLaMesa {
  constructor(private readonly sesiones: RepositorioDeSesiones) {}

  ejecutar(actor: Actor): Promise<Sesion[]> {
    return this.sesiones.listar(actor.rol === "DEMO" ? { creadaPorId: actor.id } : {});
  }
}
