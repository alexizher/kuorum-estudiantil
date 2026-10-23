import { CodigoDeSala } from "@kuorum/domain";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ParticipanteEnVivo } from "@/vistas/participante/participante-en-vivo";

export const metadata: Metadata = {
  title: "Sala",
  robots: { index: false },
  // La dirección puede traer el código de acceso: no se reenvía a otros sitios.
  referrer: "no-referrer",
};

function codigoValido(texto: string): string | null {
  try {
    return CodigoDeSala.crear(decodeURIComponent(texto)).valor;
  } catch {
    return null;
  }
}

export default async function PaginaDeParticipante({
  params,
  searchParams,
}: {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<{ c?: string | string[] }>;
}) {
  const codigo = codigoValido((await params).codigo);
  if (codigo === null) notFound();
  const { c } = await searchParams;
  const codigoInicial = typeof c === "string" && c !== "" ? c : undefined;
  return <ParticipanteEnVivo codigo={codigo} {...(codigoInicial ? { codigoInicial } : {})} />;
}
