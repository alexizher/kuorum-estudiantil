import type { Metadata } from "next";
import { exigirSesionDeMesa } from "../../../../../auth/exigir-sesion-de-mesa";
import { EntregarEnVivo } from "../../../../../vistas/mesa/entregar-en-vivo";
import { cargarSesionDeMesa } from "../../../cargar-sesion";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Entregar códigos", robots: { index: false } };

export default async function PaginaDeEntrega({ params }: { params: Promise<{ id: string }> }) {
  await exigirSesionDeMesa();
  const { id, titulo, codigo } = await cargarSesionDeMesa((await params).id);
  return <EntregarEnVivo sesion={{ id, titulo, codigo }} />;
}
