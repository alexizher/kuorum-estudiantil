import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { exigirSesionDeMesa } from "@/auth/exigir-sesion-de-mesa";
import { EditorDeActa } from "@/vistas/mesa/editor-de-acta";
import { cargarSesionDeMesa } from "../../../cargar-sesion";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Acta", robots: { index: false } };

export default async function PaginaDeActa({ params }: { params: Promise<{ id: string }> }) {
  const actor = await exigirSesionDeMesa();
  const sesion = await cargarSesionDeMesa(actor, (await params).id);
  if (sesion.estado !== "CERRADA" && sesion.estado !== "ACTA_FINAL") notFound();
  return <EditorDeActa sesionId={sesion.id} titulo={sesion.titulo} />;
}
