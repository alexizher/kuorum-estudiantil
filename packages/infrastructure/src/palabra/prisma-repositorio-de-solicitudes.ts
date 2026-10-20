import { SolicitudDePalabra } from "@kuorum/domain";
import type { RepositorioDeSolicitudes } from "@kuorum/application";
import type { SolicitudDePalabra as FilaDeSolicitud } from "../generated/prisma/client.js";
import type { ContextoTransaccional } from "../prisma/contexto-transaccional.js";

function aDominio(fila: FilaDeSolicitud): SolicitudDePalabra {
  return SolicitudDePalabra.reconstruir({
    id: fila.id,
    sesionId: fila.sesionId,
    participanteId: fila.participanteId,
    nombreVisible: fila.nombreVisible,
    tipo: fila.tipo,
    mocion: fila.mocion,
    estado: fila.estado,
    pedidaEn: fila.pedidaEn,
    inicioEn: fila.inicioEn,
    finEn: fila.finEn,
    segundosExtra: fila.segundosExtra,
  });
}

export class PrismaRepositorioDeSolicitudes implements RepositorioDeSolicitudes {
  constructor(private readonly contexto: ContextoTransaccional) {}

  async porId(id: string): Promise<SolicitudDePalabra | null> {
    const fila = await this.contexto.cliente().solicitudDePalabra.findUnique({ where: { id } });
    return fila === null ? null : aDominio(fila);
  }

  async deSesion(sesionId: string): Promise<SolicitudDePalabra[]> {
    const filas = await this.contexto.cliente().solicitudDePalabra.findMany({
      where: { sesionId },
      orderBy: [{ pedidaEn: "asc" }, { id: "asc" }],
    });
    return filas.map(aDominio);
  }

  async guardar(solicitud: SolicitudDePalabra): Promise<void> {
    const datos = {
      estado: solicitud.estado,
      inicioEn: solicitud.inicioEn,
      finEn: solicitud.finEn,
      segundosExtra: solicitud.segundosExtra,
    };
    await this.contexto.cliente().solicitudDePalabra.upsert({
      where: { id: solicitud.id },
      create: {
        id: solicitud.id,
        sesionId: solicitud.sesionId,
        participanteId: solicitud.participanteId,
        nombreVisible: solicitud.nombreVisible,
        tipo: solicitud.tipo,
        mocion: solicitud.mocion,
        pedidaEn: solicitud.pedidaEn,
        ...datos,
      },
      update: datos,
    });
  }
}
