import type { EstadoPublicoDeSesion } from "@kuorum/contracts";
import type { InstantaneaDeSesion } from "@kuorum/domain";

export function aEstadoPublico(instantanea: InstantaneaDeSesion): EstadoPublicoDeSesion {
  return {
    sesionId: instantanea.sesionId,
    estado: instantanea.estado,
    version: instantanea.version,
    actualizadaEn: instantanea.actualizadaEn.toISOString(),
  };
}
