import { Sesion, type EstadoDeSesion, type ModoDeParticipacion } from "@kuorum/domain";
import { GeneradorDeCodigosGuionado } from "./generador-de-codigos-guionado.js";
import { GeneradorDeIdsSecuencial } from "./generador-de-ids-secuencial.js";
import { HasheadorFalso } from "./hasheador-falso.js";
import { RelojFijo } from "./reloj-fijo.js";
import { RepositorioDeParticipantesEnMemoria } from "./repositorio-de-participantes-en-memoria.js";
import { RepositorioDeSesionesEnMemoria } from "./repositorio-de-sesiones-en-memoria.js";
import { UnidadDeTrabajoInmediata } from "./unidad-de-trabajo-inmediata.js";

export function crearEscenario(salasFijas: string[] = []) {
  return {
    sesiones: new RepositorioDeSesionesEnMemoria(),
    participantes: new RepositorioDeParticipantesEnMemoria(),
    unidad: new UnidadDeTrabajoInmediata(),
    hasheador: new HasheadorFalso(),
    reloj: new RelojFijo(),
    ids: new GeneradorDeIdsSecuencial(),
    codigos: new GeneradorDeCodigosGuionado(salasFijas),
  };
}

export type Escenario = ReturnType<typeof crearEscenario>;

export async function sembrarSesion(
  escenario: Escenario,
  opciones: { modo?: ModoDeParticipacion; estado?: EstadoDeSesion } = {},
): Promise<Sesion> {
  const sesion = Sesion.reconstruir({
    id: escenario.ids.nuevo(),
    titulo: "Asamblea general",
    codigoDeSala: escenario.codigos.codigoDeSala(),
    modo: opciones.modo ?? "SALA_ABIERTA",
    estado: opciones.estado ?? "PROGRAMADA",
    segundosPorIntervencion: 180,
    version: 0,
    creadaEn: escenario.reloj.ahora(),
  });
  await escenario.sesiones.guardar(sesion);
  return sesion;
}
