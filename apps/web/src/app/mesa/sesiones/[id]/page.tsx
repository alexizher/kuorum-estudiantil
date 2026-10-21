import type { Metadata } from "next";
import { exigirSesionDeMesa } from "../../../../auth/exigir-sesion-de-mesa";
import { cargarSesionDeMesa } from "../../cargar-sesion";
import { SesionEnVivo } from "../../../../vistas/mesa/sesion-en-vivo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sesión", robots: { index: false } };

export default async function PaginaDeSesion({ params }: { params: Promise<{ id: string }> }) {
  await exigirSesionDeMesa();
  const sesion = await cargarSesionDeMesa((await params).id);
  return <SesionEnVivo sesion={sesion} />;
}
