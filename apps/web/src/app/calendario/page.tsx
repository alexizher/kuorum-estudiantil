import { ErrorDeDominio } from "@kuorum/domain";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { rangoAlrededorDeHoy } from "../../calendario/consulta-publica";
import { esMes, mesActual, rangoDelMes } from "../../calendario/vista-de-calendario";
import { contenedor } from "../../composicion";
import { Calendario, type VistaDeCalendario } from "../../vistas/calendario/calendario";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Calendario" };

interface Parametros {
  vista?: string | string[];
  mes?: string | string[];
  cuerpo?: string | string[];
}

function uno(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

async function origenDeLaPeticion(): Promise<string> {
  const cabeceras = await headers();
  const host = cabeceras.get("x-forwarded-host") ?? cabeceras.get("host") ?? "localhost";
  const protocolo =
    cabeceras.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocolo}://${host}`;
}

/** Página pública: lee lo mismo que GET /api/public/v1/calendario, sin JavaScript en el cliente. */
export default async function PaginaDelCalendario({
  searchParams,
}: {
  searchParams: Promise<Parametros>;
}) {
  const parametros = await searchParams;
  const vista: VistaDeCalendario = uno(parametros.vista) === "lista" ? "lista" : "mes";
  const cuerpoSlug = uno(parametros.cuerpo);
  const c = contenedor();
  const { zonaHoraria } = await c.institucion.obtener();
  const pedido = uno(parametros.mes);
  const mes = pedido !== undefined && esMes(pedido) ? pedido : mesActual(new Date(), zonaHoraria);
  const rango = vista === "mes" ? rangoDelMes(mes, zonaHoraria) : rangoAlrededorDeHoy(0, 180);

  let calendario;
  try {
    calendario = await c.listarCalendario.ejecutar({
      ...rango,
      ...(cuerpoSlug === undefined ? {} : { cuerpoSlug }),
    });
  } catch (error) {
    if (error instanceof ErrorDeDominio && error.codigo === "CUERPO_NO_EXISTE") notFound();
    throw error;
  }
  const { institucion, cuerpos, sesiones } = calendario;
  return (
    <Calendario
      institucion={{
        nombre: institucion.nombre,
        tipoDeCuerpoPlural: institucion.tipoDeCuerpoPlural,
        zonaHoraria: institucion.zonaHoraria,
      }}
      cuerpos={cuerpos.map((cuerpo) => ({
        nombre: cuerpo.nombre,
        slug: cuerpo.slug,
        archivado: cuerpo.archivado,
      }))}
      sesiones={vista === "lista" ? sesiones.filter((s) => s.fin.getTime() > Date.now()) : sesiones}
      vista={vista}
      mes={mes}
      cuerpoSlug={cuerpoSlug}
      origen={await origenDeLaPeticion()}
    />
  );
}
