import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { exigirSesionDeMesa } from "@/auth/exigir-sesion-de-mesa";
import { PersonalEnVivo } from "@/vistas/administracion/personal-en-vivo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Personal", robots: { index: false } };

/** Solo el administrador de la instalación; para los demás la página no existe. */
export default async function PaginaDePersonal() {
  const actor = await exigirSesionDeMesa();
  if (actor.rol !== "SUPERADMIN") notFound();
  return <PersonalEnVivo />;
}
