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

/** Cuánto dura el arranque a ritmo activo al entrar a la sala. */
export const ARRANQUE_MS = 30_000;

/**
 * Al entrar, la caché del borde puede devolver el estado de antes de que se abriera una
 * votación; en reposo eso costaría 12 s más. Durante el arranque se consulta al ritmo activo.
 */
export class PoliticaConArranque implements PoliticaDeIntervalo {
  private readonly inicio: number;

  constructor(
    private readonly base: PoliticaDeIntervalo,
    private readonly ahora: () => number = Date.now,
  ) {
    this.inicio = ahora();
  }

  intervaloMs(contexto: ContextoDeIntervalo): number {
    const intervalo = this.base.intervaloMs(contexto);
    return this.ahora() - this.inicio < ARRANQUE_MS
      ? Math.min(intervalo, INTERVALO_ACTIVO_MS)
      : intervalo;
  }
}
