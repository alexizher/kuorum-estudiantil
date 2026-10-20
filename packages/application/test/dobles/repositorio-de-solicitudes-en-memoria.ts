import type { SolicitudDePalabra } from "@kuorum/domain";
import type { RepositorioDeSolicitudes } from "../../src/puertos/repositorio-de-solicitudes.js";

export class RepositorioDeSolicitudesEnMemoria implements RepositorioDeSolicitudes {
  readonly solicitudes = new Map<string, SolicitudDePalabra>();

  async porId(id: string): Promise<SolicitudDePalabra | null> {
    return this.solicitudes.get(id) ?? null;
  }

  async deSesion(sesionId: string): Promise<SolicitudDePalabra[]> {
    return [...this.solicitudes.values()].filter((s) => s.sesionId === sesionId);
  }

  async guardar(solicitud: SolicitudDePalabra): Promise<void> {
    this.solicitudes.set(solicitud.id, solicitud);
  }
}
