export { ErrorDeDominio, SesionNoEncontrada } from "./errores.js";
export type { Reloj } from "./reloj.js";
export type { EstadoDeSesion } from "./sesion/estado-de-sesion.js";
export type { ModoDeParticipacion } from "./sesion/modo-de-participacion.js";
export { CodigoDeSala } from "./sesion/codigo-de-sala.js";
export { ALFABETO_DE_CODIGOS } from "./sesion/alfabeto-de-codigos.js";
export { CodigoDeAcceso } from "./sesion/codigo-de-acceso.js";
export type { GeneradorDeCodigos } from "./sesion/generador-de-codigos.js";
export { Sesion } from "./sesion/sesion.js";
export type { DatosDeNuevaSesion, PropiedadesDeSesion } from "./sesion/sesion.js";
export type { GeneradorDeIds } from "./generador-de-ids.js";
export { Opcion, OPCIONES_SI_NO_ABSTENCION } from "./votacion/opcion.js";
export { Pregunta } from "./votacion/pregunta.js";
export type { EstadoDePregunta, PropiedadesDePregunta } from "./votacion/pregunta.js";
export { Resultado } from "./votacion/resultado.js";
export type { ResultadoPorOpcion } from "./votacion/resultado.js";
export type { RegistroDeVotos } from "./votacion/registro-de-votos.js";
export {
  PRIORIDAD_DE_MOCION,
  DESCRIPCION_DE_MOCION,
  NOMBRE_DE_MOCION,
} from "./palabra/tipo-de-mocion.js";
export type { TipoDeMocion } from "./palabra/tipo-de-mocion.js";
export { SolicitudDePalabra } from "./palabra/solicitud-de-palabra.js";
export type {
  DatosDeSolicitud,
  EstadoDeSolicitud,
  PropiedadesDeSolicitud,
  TipoDeSolicitud,
} from "./palabra/solicitud-de-palabra.js";
export { ColaDeIntervenciones } from "./palabra/cola-de-intervenciones.js";
export type { Modalidad } from "./sesion/modalidad.js";
export type { CambiosDeProgramacion } from "./sesion/sesion.js";
export { Cuerpo } from "./institucion/cuerpo.js";
export type { PropiedadesDeCuerpo, TipoDeCuerpo } from "./institucion/cuerpo.js";
export { Institucion } from "./institucion/institucion.js";
export type { PropiedadesDeInstitucion } from "./institucion/institucion.js";
export { aHoraLocal, deHoraLocal } from "./calendario/hora-local.js";
export { seCruzan } from "./calendario/cruces.js";
export type { Tramo } from "./calendario/cruces.js";
export { Decision } from "./decisiones/decision.js";
export type {
  DatosDeDecision,
  FotoDeResultado,
  PropiedadesDeDecision,
} from "./decisiones/decision.js";
export { Acta } from "./actas/acta.js";
export type {
  ContenidoDeActa,
  DecisionDeActa,
  EstadoDeActa,
  PropiedadesDeActa,
} from "./actas/acta.js";
export { CodigoDeVerificacion } from "./actas/codigo-de-verificacion.js";
