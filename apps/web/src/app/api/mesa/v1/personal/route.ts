import { esquemaPersona } from "@kuorum/contracts";
import { contenedor } from "../../../../../composicion";
import { accionDeMesa } from "../../../../../http/accion-de-mesa";
import { leerCuerpo } from "../../../../../http/cuerpo";
import { accion, solicitudInvalida } from "../../../../../http/respuestas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request): Promise<Response> {
  return accionDeMesa(request, async (actor) => {
    const personal = await contenedor().listarPersonal.ejecutar(actor);
    return accion({
      personal: personal.map((persona) => ({
        id: persona.id,
        nombre: persona.nombre,
        correo: persona.correo,
        membresias: persona.membresias.map(({ cuerpoId, rol }) => ({ cuerpoId, rol })),
      })),
    });
  });
}

/** La contraseña viaja una sola vez, en esta respuesta, y nunca se guarda en claro. */
export function POST(request: Request): Promise<Response> {
  return accionDeMesa(request, async (actor) => {
    const datos = await leerCuerpo(request, esquemaPersona);
    if (datos === undefined) return solicitudInvalida();
    const creada = await contenedor().crearCuentaDePersonal.ejecutar(
      actor,
      datos.correo,
      datos.nombre,
    );
    return accion(creada, 201);
  });
}
