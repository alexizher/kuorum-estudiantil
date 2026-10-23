import type { Actor as ActorDeAplicacion, RolDeMesa } from "@kuorum/application";
import { contenedor } from "@/composicion";

export interface Actor extends ActorDeAplicacion {
  correo: string;
  nombre: string;
}

const ROLES: readonly RolDeMesa[] = ["SUPERADMIN", "MESA", "DEMO"];

/** Un rol que no se reconoce se trata como DEMO: ante la duda, el que menos puede ver. */
function rolDe(valor: unknown): RolDeMesa {
  return ROLES.find((rol) => rol === valor) ?? "DEMO";
}

function noAutenticado(): Response {
  return Response.json(
    { error: "NO_AUTENTICADO" },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

function getAuthPromise() {
  return contenedor().autenticacion();
}

export async function exigirMesa(solicitud: Request): Promise<Actor | Response> {
  try {
    const auth = await getAuthPromise();
    const sesion = await auth.api.getSession({ headers: solicitud.headers });
    if (sesion === null || sesion === undefined) return noAutenticado();
    const membresias = await contenedor().membresias.deUsuario(sesion.user.id);
    return {
      id: sesion.user.id,
      correo: sesion.user.email,
      nombre: sesion.user.name,
      rol: rolDe((sesion.user as { rol?: unknown }).rol),
      membresias: membresias.map(({ cuerpoId, rol }) => ({ cuerpoId, rol })),
    };
  } catch (error) {
    console.error(error);
    return noAutenticado();
  }
}
