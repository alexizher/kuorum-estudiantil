import { notFound } from "next/navigation";
import { contenedor } from "../../composicion";
import type { ModoDeSala } from "../../vistas/mesa/cliente-de-mesa";

export interface SesionParaLaMesa {
  id: string;
  titulo: string;
  codigo: string;
  modo: ModoDeSala;
  estado: string;
}

/** Lee la sesión para las páginas del servidor; 404 si no existe. */
export async function cargarSesionDeMesa(id: string): Promise<SesionParaLaMesa> {
  const sesion = await contenedor().sesiones.porId(id);
  if (sesion === null) notFound();
  return {
    id: sesion.id,
    titulo: sesion.titulo,
    codigo: sesion.codigoDeSala.valor,
    modo: sesion.modo,
    estado: sesion.estado,
  };
}
