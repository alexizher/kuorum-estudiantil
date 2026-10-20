/** Intervalos de la consulta periódica. Es el único lugar donde se fijan. */
export const INTERVALO_ACTIVO_MS = 3000;
export const INTERVALO_EN_REPOSO_MS = 12_000;

export interface ContextoDeIntervalo {
  votacionAbierta: boolean;
  enFilaDePalabra: boolean;
}

export const CONTEXTO_EN_REPOSO: ContextoDeIntervalo = {
  votacionAbierta: false,
  enFilaDePalabra: false,
};

export interface PoliticaDeIntervalo {
  intervaloMs(contexto: ContextoDeIntervalo): number;
}

export class PoliticaAdaptativa implements PoliticaDeIntervalo {
  intervaloMs(contexto: ContextoDeIntervalo): number {
    return contexto.votacionAbierta || contexto.enFilaDePalabra
      ? INTERVALO_ACTIVO_MS
      : INTERVALO_EN_REPOSO_MS;
  }
}

export class PoliticaFija implements PoliticaDeIntervalo {
  constructor(private readonly ms: number) {}

  intervaloMs(): number {
    return this.ms;
  }
}
