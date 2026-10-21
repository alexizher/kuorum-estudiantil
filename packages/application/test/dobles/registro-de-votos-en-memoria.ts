import { ErrorDeDominio, type RegistroDeVotos } from "@kuorum/domain";

/** Como la infraestructura: emitidos y conteos por separado, sin unir participante con opción. */
export class RegistroDeVotosEnMemoria implements RegistroDeVotos {
  private readonly emitidos = new Set<string>();
  private readonly totales = new Map<string, Map<string, number>>();

  async emitir(preguntaId: string, participanteId: string, opcionId: string): Promise<void> {
    const clave = `${preguntaId}|${participanteId}`;
    if (this.emitidos.has(clave)) throw new ErrorDeDominio("YA_VOTO");
    this.emitidos.add(clave);
    const conteos = this.totales.get(preguntaId) ?? new Map<string, number>();
    conteos.set(opcionId, (conteos.get(opcionId) ?? 0) + 1);
    this.totales.set(preguntaId, conteos);
  }

  async conteos(preguntaId: string): Promise<Map<string, number>> {
    return new Map(this.totales.get(preguntaId) ?? []);
  }

  async votosEmitidos(preguntaId: string): Promise<number> {
    return [...this.emitidos].filter((c) => c.startsWith(`${preguntaId}|`)).length;
  }
}
