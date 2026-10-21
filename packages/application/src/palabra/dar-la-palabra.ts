import type { Reloj } from "@kuorum/domain";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { RepositorioDeSolicitudes } from "../puertos/repositorio-de-solicitudes.js";
import type { UnidadDeTrabajo } from "../puertos/unidad-de-trabajo.js";
import type { Actor } from "../sala/actor.js";
import { cargarColaDeLaMesa, guardarColaDeLaSesion } from "./cola-de-la-sesion.js";

export class DarLaPalabra {
  constructor(
    private readonly sesiones: RepositorioDeSesiones,
    private readonly solicitudes: RepositorioDeSolicitudes,
    private readonly reloj: Reloj,
    private readonly unidad: UnidadDeTrabajo,
  ) {}

  ejecutar(actor: Actor, sesionId: string, solicitudId: string | null): Promise<void> {
    return this.unidad.ejecutar(async () => {
      const contexto = await cargarColaDeLaMesa(this.sesiones, this.solicitudes, actor, sesionId);
      contexto.cola.darLaPalabra(solicitudId, this.reloj);
      await guardarColaDeLaSesion(this.sesiones, this.solicitudes, contexto);
    });
  }
}
