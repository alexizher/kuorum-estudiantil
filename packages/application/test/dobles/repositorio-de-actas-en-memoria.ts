import type { Acta, CodigoDeVerificacion, Sesion } from "@kuorum/domain";
import type { RepositorioDeActas } from "../../src/puertos/repositorio-de-actas.js";
import type { FiltroPublico } from "../../src/puertos/repositorio-de-decisiones.js";
import type { RepositorioDeSesionesEnMemoria } from "./repositorio-de-sesiones-en-memoria.js";

export class RepositorioDeActasEnMemoria implements RepositorioDeActas {
  readonly actas = new Map<string, Acta>();

  constructor(private readonly sesiones: RepositorioDeSesionesEnMemoria) {}

  async deSesion(sesionId: string): Promise<Acta | null> {
    return this.actas.get(sesionId) ?? null;
  }

  async porCodigo(codigo: CodigoDeVerificacion): Promise<Acta | null> {
    return [...this.actas.values()].find((a) => a.codigo?.valor === codigo.valor) ?? null;
  }

  async guardar(acta: Acta): Promise<void> {
    this.actas.set(acta.sesionId, acta);
  }

  async publicas(filtro: FiltroPublico): Promise<{ acta: Acta; sesion: Sesion }[]> {
    const resultado: { acta: Acta; sesion: Sesion }[] = [];
    for (const acta of this.actas.values()) {
      const sesion = await this.sesiones.porId(acta.sesionId);
      if (acta.estado !== "FINAL" || sesion === null) continue;
      if (sesion.estado !== "ACTA_FINAL" || sesion.creadaPorDemo) continue;
      if (filtro.cuerpoId !== undefined && sesion.cuerpoId !== filtro.cuerpoId) continue;
      const en = acta.finalizadaEn;
      if (en === null || en < filtro.desde || en >= filtro.hasta) continue;
      resultado.push({ acta, sesion });
    }
    return resultado.sort(
      (a, b) => (a.acta.finalizadaEn?.getTime() ?? 0) - (b.acta.finalizadaEn?.getTime() ?? 0),
    );
  }
}
