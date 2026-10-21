import { notFound } from "next/navigation";
import { contenedor } from "../../composicion";
import type { Actor } from "../../http/exigir-mesa";
import { ErrorDeDominio } from "@kuorum/domain";
import type { ModoDeSala } from "../../vistas/mesa/cliente-de-mesa";

export interface SesionParaLaMesa {
  id: string;
  titulo: string;
  codigo: string;
  modo: ModoDeSala;
  estado: string;
}

/**
 * Lee la sesión para las páginas del servidor. 404 si no existe o si la cuenta de prueba pide una
 * que no creó: las dos se ven igual.
 */
export async function cargarSesionDeMesa(actor: Actor, id: string): Promise<SesionParaLaMesa> {
  try {
    const sesion = await contenedor().obtenerSesionDeLaMesa.ejecutar(actor, id);
    return {
      id: sesion.id,
      titulo: sesion.titulo,
      codigo: sesion.codigoDeSala.valor,
      modo: sesion.modo,
      estado: sesion.estado,
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
