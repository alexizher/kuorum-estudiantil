import type { Metadata } from "next";
import { contenedor } from "../../../composicion";
import { VerificacionDeActa } from "../../../vistas/actas/verificacion-de-acta";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verificar un acta" };

/** Pública y sin JavaScript en el cliente: el formulario es un GET. */
export default async function PaginaDeVerificacion({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string | string[] }>;
}) {
  const { codigo: pedido } = await searchParams;
  const codigo = Array.isArray(pedido) ? pedido[0] : pedido;
  const acta = codigo === undefined ? null : await contenedor().verificarActa.ejecutar(codigo);
  return <VerificacionDeActa codigo={codigo} acta={acta} />;
}
