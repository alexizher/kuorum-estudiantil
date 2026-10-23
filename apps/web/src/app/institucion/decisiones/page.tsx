import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { rangoAlrededorDeHoy } from "@/calendario/consulta-publica";
import { contenedor } from "@/composicion";
import type { DecisionesPorCuerpo } from "@kuorum/application";
import { DecisionesInstitucion } from "./decisiones-institucion";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Decisiones de la institución" };

interface Parametros {
  desde?: string | string[];
  hasta?: string | string[];
}

function uno(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

export default async function PaginaDecisionesInstitucion({
  searchParams,
}: {
  searchParams: Promise<Parametros>;
}) {
  const parametros = await searchParams;
  const c = contenedor();
  const { zonaHoraria } = await c.institucion.obtener();
  const rango = rangoAlrededorDeHoy(365, 1);

  const desdeParam = uno(parametros.desde);
  const hastaParam = uno(parametros.hasta);
  const desde = desdeParam ? new Date(desdeParam) : rango.desde;
  const hasta = hastaParam ? new Date(hastaParam) : rango.hasta;

  if (Number.isNaN(desde.getTime()) || Number.isNaN(hasta.getTime())) {
    notFound();
  }

  let datos: DecisionesPorCuerpo[];
  try {
    datos = await c.listarDecisionesDeLaInstitucion.ejecutar({ desde, hasta });
  } catch (error) {
    if (error instanceof Error && error.message === "CUERPO_NO_EXISTE") notFound();
    throw error;
  }

  const cuerpos = datos.map((d) => ({
    id: d.cuerpoId,
    nombre: d.cuerpoNombre,
    slug: d.cuerpoSlug,
    tipo: d.cuerpoTipo,
    decisiones: d.decisiones,
  }));

  return (
    <DecisionesInstitucion
      institucion={{ zonaHoraria }}
      cuerpos={cuerpos}
      desde={desde}
      hasta={hasta}
    />
  );
}