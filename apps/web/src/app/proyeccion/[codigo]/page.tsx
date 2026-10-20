import { CodigoDeSala } from "@kuorum/domain";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProyeccionEnVivo } from "../../../vistas/proyeccion/proyeccion-en-vivo";

export const metadata: Metadata = {
  title: "Proyección",
  robots: { index: false },
};

function codigoValido(texto: string): string | null {
  try {
    return CodigoDeSala.crear(decodeURIComponent(texto)).valor;
  } catch {
    return null;
  }
}

export default async function PaginaDeProyeccion({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const codigo = codigoValido((await params).codigo);
  if (codigo === null) notFound();
  return <ProyeccionEnVivo codigo={codigo} />;
}
