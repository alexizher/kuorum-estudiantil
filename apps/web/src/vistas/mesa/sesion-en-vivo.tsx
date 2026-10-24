"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { FuenteDeEstadoPorConsulta } from "@/tiempo-real/fuente-por-consulta";
import { PoliticaFija } from "@/tiempo-real/intervalo-adaptativo";
import { ClienteDeMesaPorFetch } from "./cliente-de-mesa";
import { PanelDeSesion, type SesionDelPanel } from "./panel-de-sesion";
import { useGestionDeSesion } from "./use-gestion-de-sesion";
import { enlaceParaParticipantes } from "./textos";
import { useDecisiones } from "./use-decisiones";
import { useFormularioDePregunta } from "./use-formulario-de-pregunta";
import { usePanelDeSesion } from "./use-panel-de-sesion";
import { useSegundosRestantes } from "./use-segundos-restantes";

const INTERVALO_DE_LA_MESA_MS = 3000;

interface Propiedades {
  sesion: SesionDelPanel;
  esDemo?: boolean;
  /** Para pruebas; por defecto el fetch del navegador. */
  dependencias?: { fetch?: typeof globalThis.fetch };
}

async function copiarAlPortapapeles(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

export function SesionEnVivo({ sesion, esDemo = false, dependencias }: Propiedades) {
  const { cliente, fuente } = useMemo(() => {
    const llamar: typeof globalThis.fetch =
      dependencias?.fetch ?? ((entrada, opciones) => fetch(entrada, opciones));
    return {
      cliente: new ClienteDeMesaPorFetch(llamar),
      fuente: new FuenteDeEstadoPorConsulta(llamar, new PoliticaFija(INTERVALO_DE_LA_MESA_MS)),
    };
  }, [dependencias]);

  const router = useRouter();
  const panel = usePanelDeSesion({ id: sesion.id, codigo: sesion.codigo }, fuente, cliente);
  // Los datos de la sesión vienen del servidor: tras reprogramar o cancelar se vuelven a pedir.
  const gestion = useGestionDeSesion(cliente, sesion.id, () => router.refresh());
  const cerradas = panel.preguntas.filter((p) => p.estado === "CERRADA").length;
  const decisiones = useDecisiones(cliente, sesion.id, cerradas);
  const formulario = useFormularioDePregunta(panel.acciones.crearPregunta);
  const segundosRestantes = useSegundosRestantes(panel.estado);

  return (
    <PanelDeSesion
      sesion={sesion}
      esDemo={esDemo}
      panel={panel}
      gestion={{ acciones: gestion, cliente }}
      formulario={formulario}
      decisiones={decisiones}
      segundosRestantes={segundosRestantes}
      alCopiarEnlace={() =>
        copiarAlPortapapeles(enlaceParaParticipantes(window.location.origin, sesion.codigo))
      }
    />
  );
}
