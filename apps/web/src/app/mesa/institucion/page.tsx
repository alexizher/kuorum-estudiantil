import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { exigirSesionDeMesa } from "../../../auth/exigir-sesion-de-mesa";
import { InstitucionEnVivo } from "../../../vistas/administracion/institucion-en-vivo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Institución", robots: { index: false } };

/** Solo el administrador de la instalación; para los demás la página no existe. */
export default async function PaginaDeInstitucion() {
  const actor = await exigirSesionDeMesa();
  if (actor.rol !== "SUPERADMIN") notFound();
  return <InstitucionEnVivo />;
}
