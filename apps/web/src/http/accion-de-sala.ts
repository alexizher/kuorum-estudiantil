import { CodigoDeSala, ErrorDeDominio } from "@kuorum/domain";
import { contenedor } from "@/composicion";
import { excedeElLimiteDeVotos } from "./limite-de-tasa";
import { vieneDeOtroSitio } from "./origen";
import { respuestaDeError } from "./respuesta-de-error";
import { demasiadasSolicitudes, origenNoPermitido } from "./respuestas";
import { codigoDeSalaDeLaUrl, exigirParticipante } from "./sesion-de-participante";

export interface ContextoDeSala {
  codigo: string;
  participanteId: string;
}

export type ParametrosDeSala = { params: Promise<{ codigo: string }> };

/** Id de la sesión de esa sala, o 404 SALA_NO_DISPONIBLE. */
export async function sesionIdDeSala(codigo: string): Promise<string> {
  const sesion = await contenedor().sesiones.porCodigoDeSala(CodigoDeSala.crear(codigo));
  if (sesion === null) throw new ErrorDeDominio("SALA_NO_DISPONIBLE");
  return sesion.id;
}

/**
 * Plantilla de las acciones del participante: rechazo de otros sitios, código de la URL,
 * límite de tasa (si se pide), cookie firmada y traducción de errores. El trabajo recibe el participante.
 */
export async function accionDeParticipante(
  solicitud: Request,
  contexto: ParametrosDeSala,
  trabajo: (c: ContextoDeSala) => Promise<Response>,
  limitar?: "votos",
): Promise<Response> {
  if (vieneDeOtroSitio(solicitud)) return origenNoPermitido();
  try {
    const codigo = codigoDeSalaDeLaUrl((await contexto.params).codigo);
    const participanteId = exigirParticipante(solicitud, codigo);
    if (participanteId instanceof Response) return participanteId;
    if (limitar === "votos" && excedeElLimiteDeVotos(participanteId)) {
      return demasiadasSolicitudes();
    }
    return await trabajo({ codigo, participanteId });
  } catch (error) {
    return respuestaDeError(error);
  }
}
