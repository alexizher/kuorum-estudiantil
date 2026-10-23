import type { Metadata } from "next";
import { exigirSesionDeMesa } from "@/auth/exigir-sesion-de-mesa";
import { cargarSesionDeMesa } from "../../cargar-sesion";
import { SesionEnVivo } from "@/vistas/mesa/sesion-en-vivo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sesión", robots: { index: false } };

export default async function PaginaDeSesion({ params }: { params: Promise<{ id: string }> }) {
  const actor = await exigirSesionDeMesa();
  const sesion = await cargarSesionDeMesa(actor, (await params).id);
  return <SesionEnVivo sesion={sesion} esDemo={actor.rol === "DEMO"} />;
}
