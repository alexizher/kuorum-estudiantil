import type { Metadata } from "next";
import { exigirSesionDeMesa } from "../../auth/exigir-sesion-de-mesa";
import { MesaEnVivo } from "../../vistas/mesa/mesa-en-vivo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mesa", robots: { index: false } };

export default async function PaginaDeMesa() {
  const actor = await exigirSesionDeMesa();
  return <MesaEnVivo esDemo={actor.rol === "DEMO"} />;
}
