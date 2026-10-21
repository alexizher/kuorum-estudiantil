import { esquemaCrearSesion } from "@kuorum/contracts";
import { contenedor } from "../../../../../composicion";
import { accionDeMesa } from "../../../../../http/accion-de-mesa";
import { leerCuerpo } from "../../../../../http/cuerpo";
import { accion, solicitudInvalida } from "../../../../../http/respuestas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface SesionVista {
  id: string;
  titulo: string;
  codigoDeSala: { valor: string };
  estado: string;
  modo: string;
  creadaEn: Date;
}

function aVista(sesion: SesionVista) {
  return {
    id: sesion.id,
    titulo: sesion.titulo,
    codigoDeSala: sesion.codigoDeSala.valor,
    estado: sesion.estado,
    modo: sesion.modo,
    creadaEn: sesion.creadaEn.toISOString(),
  };
}

export function GET(request: Request): Promise<Response> {
  return accionDeMesa(request, async () => {
    const sesiones = await contenedor().sesiones.listar();
    return accion({ sesiones: sesiones.map(aVista) });
  });
}

export function POST(request: Request): Promise<Response> {
  return accionDeMesa(request, async () => {
    const cuerpo = await leerCuerpo(request, esquemaCrearSesion);
    if (cuerpo === undefined) return solicitudInvalida();
    const sesion = await contenedor().crearSesion.ejecutar(
      cuerpo.titulo,
      cuerpo.modo,
      cuerpo.segundosPorIntervencion,
    );
    return accion(aVista(sesion), 201);
  });
}
