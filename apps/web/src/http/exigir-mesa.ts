import { contenedor } from "../composicion";

export interface Actor {
  id: string;
  correo: string;
  nombre: string;
}

function noAutenticado(): Response {
  return Response.json(
    { error: "NO_AUTENTICADO" },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

export async function exigirMesa(solicitud: Request): Promise<Actor | Response> {
  try {
    const sesion = await contenedor()
      .autenticacion()
      .api.getSession({ headers: solicitud.headers });
    if (sesion === null || sesion === undefined) return noAutenticado();
    return { id: sesion.user.id, correo: sesion.user.email, nombre: sesion.user.name };
  } catch (error) {
    console.error(error);
    return noAutenticado();
  }
}
