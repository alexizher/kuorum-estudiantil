import { puedeGestionar, type Actor } from "@kuorum/application";
import { aHoraLocal, type Cuerpo, type Sesion } from "@kuorum/domain";

/** `2026-11-03T14:00` en la zona dada: lo que el formulario muestra y vuelve a mandar. */
export function horaLocal(instante: Date, zona: string): string {
  const { fecha, hora } = aHoraLocal(instante, zona);
  return `${fecha}T${hora}`;
}

/** La sesión como la ve la mesa en la lista y al crearla. */
export function vistaDeSesion(
  sesion: Sesion,
  cuerpos: readonly Pick<Cuerpo, "id" | "nombre">[],
  zona: string,
  actor: Actor,
) {
  return {
    id: sesion.id,
    titulo: sesion.titulo,
    codigoDeSala: sesion.codigoDeSala.valor,
    estado: sesion.estado,
    modo: sesion.modo,
    creadaEn: sesion.creadaEn.toISOString(),
    cuerpo: {
      id: sesion.cuerpoId,
      nombre: cuerpos.find((c) => c.id === sesion.cuerpoId)?.nombre ?? "",
    },
    inicio: sesion.inicio.toISOString(),
    fin: sesion.fin.toISOString(),
    inicioLocal: horaLocal(sesion.inicio, zona),
    finLocal: horaLocal(sesion.fin, zona),
    modalidad: sesion.modalidad,
    lugar: sesion.lugar,
    ordenDelDia: [...sesion.ordenDelDia],
    puedeGestionar: puedeGestionar(actor, sesion),
  };
}
