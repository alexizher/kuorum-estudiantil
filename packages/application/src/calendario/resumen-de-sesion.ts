import type { Cuerpo, EstadoDeSesion, Modalidad, Sesion } from "@kuorum/domain";

/** Lo que se muestra de una sesión en el calendario y en los cruces. Sin código de sala. */
export interface ResumenDeSesion {
  id: string;
  titulo: string;
  cuerpo: { id: string; nombre: string; slug: string };
  inicio: Date;
  fin: Date;
  modalidad: Modalidad;
  lugar: string | null;
  estado: EstadoDeSesion;
}

export function resumir(sesiones: Sesion[], cuerpos: Cuerpo[]): ResumenDeSesion[] {
  const porId = new Map(cuerpos.map((c) => [c.id, c]));
  return sesiones.map((sesion) => {
    const cuerpo = porId.get(sesion.cuerpoId);
    return {
      id: sesion.id,
      titulo: sesion.titulo,
      cuerpo: {
        id: sesion.cuerpoId,
        nombre: cuerpo?.nombre ?? "",
        slug: cuerpo?.slug ?? "",
      },
      inicio: sesion.inicio,
      fin: sesion.fin,
      modalidad: sesion.modalidad,
      lugar: sesion.lugar,
      estado: sesion.estado,
    };
  });
}
