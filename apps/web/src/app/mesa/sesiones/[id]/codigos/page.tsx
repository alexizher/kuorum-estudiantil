import type { Metadata } from "next";
import { exigirSesionDeMesa } from "../../../../../auth/exigir-sesion-de-mesa";
import { CodigosEnVivo } from "../../../../../vistas/mesa/codigos-en-vivo";
import { cargarSesionDeMesa } from "../../../cargar-sesion";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Generar códigos", robots: { index: false } };

export default async function PaginaDeCodigos({ params }: { params: Promise<{ id: string }> }) {
  await exigirSesionDeMesa();
  const { id, titulo, codigo } = await cargarSesionDeMesa((await params).id);
  return <CodigosEnVivo sesion={{ id, titulo, codigo }} />;
}
