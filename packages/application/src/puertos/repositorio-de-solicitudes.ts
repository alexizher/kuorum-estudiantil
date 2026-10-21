import type { SolicitudDePalabra } from "@kuorum/domain";

export interface RepositorioDeSolicitudes {
  porId(id: string): Promise<SolicitudDePalabra | null>;
  deSesion(sesionId: string): Promise<SolicitudDePalabra[]>;
  guardar(solicitud: SolicitudDePalabra): Promise<void>;
}
