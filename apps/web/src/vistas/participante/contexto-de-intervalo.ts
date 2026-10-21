import type { ContextoDeIntervalo } from "../../tiempo-real/intervalo-adaptativo";

/** Lo que decide a cuánto consulta el celular: hay algo que votar o se espera turno. */
export function contextoDeIntervalo(
  votacion: { abierta: unknown; yaVoto: boolean },
  palabra: { enFila: boolean },
): ContextoDeIntervalo {
  return {
    votacionAbierta: votacion.abierta !== null && !votacion.yaVoto,
    enFilaDePalabra: palabra.enFila,
  };
}
