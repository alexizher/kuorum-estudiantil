import type { GeneradorDeIds } from "@kuorum/domain";

export class GeneradorDeIdsSecuencial implements GeneradorDeIds {
  private contador = 0;

  nuevo(): string {
    this.contador += 1;
    return `id-${this.contador}`;
  }
}
