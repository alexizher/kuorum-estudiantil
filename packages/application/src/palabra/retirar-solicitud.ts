import { ErrorDeDominio } from "@kuorum/domain";
import type { RepositorioDeParticipantes } from "../puertos/repositorio-de-participantes.js";
import type { RepositorioDeSesiones } from "../puertos/repositorio-de-sesiones.js";
import type { RepositorioDeSolicitudes } from "../puertos/repositorio-de-solicitudes.js";
import type { UnidadDeTrabajo } from "../puertos/unidad-de-trabajo.js";
import { cargarColaDeLaSesion, guardarColaDeLaSesion } from "./cola-de-la-sesion.js";
import { exigirParticipanteDeLaSesion } from "../sala/exigir-participante-de-la-sesion.js";

export class RetirarSolicitud {
  constructor(
    private readonly participantes: RepositorioDeParticipantes,
    private readonly sesiones: RepositorioDeSesiones,
    private readonly solicitudes: RepositorioDeSolicitudes,
    private readonly unidad: UnidadDeTrabajo,
  ) {}

  ejecutar(participanteId: string, solicitudId: string): Promise<void> {
    return this.unidad.ejecutar(async () => {
      const solicitud = await this.solicitudes.porId(solicitudId);
      if (solicitud === null) throw new ErrorDeDominio("SOLICITUD_NO_DISPONIBLE");
      await exigirParticipanteDeLaSesion(this.participantes, participanteId, solicitud.sesionId);
      const contexto = await cargarColaDeLaSesion(
        this.sesiones,
        this.solicitudes,
        solicitud.sesionId,
      );
      contexto.cola.retirar(solicitudId, participanteId);
      await guardarColaDeLaSesion(this.sesiones, this.solicitudes, contexto);
    });
  }
}
