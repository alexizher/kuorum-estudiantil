"use client";

import { useMemo } from "react";
import { FuenteDeEstadoPorConsulta } from "../../tiempo-real/fuente-por-consulta";
import { PoliticaFija } from "../../tiempo-real/intervalo-adaptativo";
import { ClienteDeMesaPorFetch, type ModoDeSala } from "./cliente-de-mesa";
import { PanelDeSesion } from "./panel-de-sesion";
import { enlaceParaParticipantes } from "./textos";
import { useFormularioDePregunta } from "./use-formulario-de-pregunta";
import { usePanelDeSesion } from "./use-panel-de-sesion";
import { useSegundosRestantes } from "./use-segundos-restantes";

const INTERVALO_DE_LA_MESA_MS = 3000;

interface Propiedades {
  sesion: { id: string; titulo: string; codigo: string; modo: ModoDeSala; estado: string };
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

  const panel = usePanelDeSesion({ id: sesion.id, codigo: sesion.codigo }, fuente, cliente);
  const formulario = useFormularioDePregunta(panel.acciones.crearPregunta);
  const segundosRestantes = useSegundosRestantes(panel.estado);

  return (
    <PanelDeSesion
      sesion={sesion}
      esDemo={esDemo}
      panel={panel}
      formulario={formulario}
      segundosRestantes={segundosRestantes}
      alCopiarEnlace={() =>
        copiarAlPortapapeles(enlaceParaParticipantes(window.location.origin, sesion.codigo))
      }
    />
  );
}
