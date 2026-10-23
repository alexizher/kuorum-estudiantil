import { notFound } from "next/navigation";
import { contenedor } from "../../composicion";
import type { Actor } from "../../http/exigir-mesa";
import { ErrorDeDominio } from "@kuorum/domain";
import { horaLocal, vistaDeSesion } from "../../http/vista-de-sesion";
import type { SesionDelPanel } from "../../vistas/mesa/panel-de-sesion";

export type SesionParaLaMesa = SesionDelPanel;

/**
 * Lee la sesión para las páginas del servidor. 404 si no existe o si la cuenta de prueba pide una
 * que no creó: las dos se ven igual.
 */
export async function cargarSesionDeMesa(actor: Actor, id: string): Promise<SesionParaLaMesa> {
  try {
    const c = contenedor();
    const sesion = await c.obtenerSesionDeLaMesa.ejecutar(actor, id);
    const [cuerpos, institucion] = await Promise.all([c.cuerpos.listar(), c.institucion.obtener()]);
    const vista = vistaDeSesion(sesion, cuerpos, institucion.zonaHoraria, actor);
    return {
      id: sesion.id,
      titulo: sesion.titulo,
      codigo: sesion.codigoDeSala.valor,
      modo: sesion.modo,
      estado: sesion.estado,
      programacion: {
        cuerpo: vista.cuerpo.nombre,
        inicioLocal: horaLocal(sesion.inicio, institucion.zonaHoraria),
        finLocal: horaLocal(sesion.fin, institucion.zonaHoraria),
        modalidad: sesion.modalidad,
        lugar: sesion.lugar,
        puedeGestionar: vista.puedeGestionar,
      },
    };
  } catch (error) {
    if (
      error instanceof ErrorDeDominio &&
      ["SESION_AJENA", "SESION_NO_ENCONTRADA"].includes(error.codigo)
    ) {
      notFound();
    }
    throw error;
  }
}
