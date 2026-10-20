import type { GeneradorDeIds, Reloj, TipoDeMocion } from "@kuorum/domain";
import type { RepositorioDeParticipantes } from "../puertos/repositorio-de-participantes.js";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { RepositorioDeSolicitudes } from "../puertos/repositorio-de-solicitudes.js";
import type { UnidadDeTrabajo } from "../puertos/unidad-de-trabajo.js";
import { exigirParticipanteDeLaSesion } from "./exigir-participante-de-la-sesion.js";
import { cargarColaDeLaSesion, guardarColaDeLaSesion } from "./cola-de-la-sesion.js";

export class PresentarMocion {
  constructor(
    private readonly participantes: RepositorioDeParticipantes,
    private readonly sesiones: RepositorioDeSesiones,
    private readonly solicitudes: RepositorioDeSolicitudes,
    private readonly reloj: Reloj,
    private readonly ids: GeneradorDeIds,
    private readonly unidad: UnidadDeTrabajo,
  ) {}

  /** Devuelve el id de la solicitud creada. */
  ejecutar(
    participanteId: string,
    sesionId: string,
    nombreVisible: string,
    tipo: TipoDeMocion,
  ): Promise<string> {
    return this.unidad.ejecutar(async () => {
      const contexto = await cargarColaDeLaSesion(this.sesiones, this.solicitudes, sesionId);
      await exigirParticipanteDeLaSesion(this.participantes, participanteId, sesionId);
      const nueva = contexto.cola.pedir(
        { participanteId, nombreVisible, tipo: "MOCION", mocion: tipo },
        this.reloj,
        this.ids,
      );
      await guardarColaDeLaSesion(this.sesiones, this.solicitudes, contexto);
      return nueva.id;
    });
  }
}
