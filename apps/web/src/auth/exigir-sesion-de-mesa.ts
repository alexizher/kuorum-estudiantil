import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { exigirMesa, type Actor } from "../http/exigir-mesa";

/** Para las páginas de la mesa: sin sesión, al ingreso. */
export async function exigirSesionDeMesa(): Promise<Actor> {
  const solicitud = new Request("http://interno.local/", { headers: await headers() });
  const actor = await exigirMesa(solicitud);
  if (actor instanceof Response) redirect("/mesa/ingresar");
  return actor;
}
