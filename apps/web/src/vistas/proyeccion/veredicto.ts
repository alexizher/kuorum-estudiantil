import type { EstadoDeSala } from "@kuorum/contracts";
import { textoDeVotos } from "./textos";

type Resultado = NonNullable<NonNullable<EstadoDeSala["pregunta"]>["resultado"]>;

export interface Veredicto {
  palabra: string;
  regla: string;
  tono: "si" | "no" | "neutro";
}

const REGLA = "Regla: mayoría simple de votos emitidos.";

function votosDe(resultado: Resultado, texto: string): number {
  const opcion = resultado.porOpcion.find((o) => o.texto.trim().toLowerCase() === texto);
  return opcion?.votos ?? 0;
}

export function veredictoDe(resultado: Resultado): Veredicto {
  if (resultado.aprobada !== null) {
    const diferencia = votosDe(resultado, "sí") - votosDe(resultado, "no");
    if (diferencia > 0) {
      return {
        palabra: "Aprobada",
        regla: `${REGLA} Sí supera a No por ${textoDeVotos(diferencia)}.`,
        tono: "si",
      };
    }
    if (diferencia < 0) {
      return {
        palabra: "Rechazada",
        regla: `${REGLA} No supera a Sí por ${textoDeVotos(-diferencia)}.`,
        tono: "no",
      };
    }
    return {
      palabra: "Empate",
      regla: `${REGLA} Sí y No tienen los mismos votos.`,
      tono: "neutro",
    };
  }
  const ganadora = resultado.porOpcion.find((o) => o.opcionId === resultado.ganadora);
  if (ganadora) {
    return {
      palabra: ganadora.texto,
      regla: `${REGLA} Gana la opción con más votos.`,
      tono: "neutro",
    };
  }
  return { palabra: "Empate", regla: `${REGLA} Hay empate en el primer lugar.`, tono: "neutro" };
}
