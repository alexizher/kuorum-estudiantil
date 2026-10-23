import { Cuerpo } from "@kuorum/domain";
import type { RepositorioDeCuerpos } from "../../src/puertos/repositorio-de-cuerpos.js";
import { CUERPO_ARCHIVADO, CUERPO_GENERAL, CUERPO_INGENIERIA, CUERPO_MEDICINA } from "./actores.js";

export class RepositorioDeCuerposEnMemoria implements RepositorioDeCuerpos {
  readonly cuerpos = new Map<string, Cuerpo>();

  constructor() {
    const archivado = Cuerpo.nuevo({
      id: CUERPO_ARCHIVADO,
      nombre: "Escuela vieja",
      tipo: "FACULTAD",
    });
    archivado.archivar();
    for (const cuerpo of [
      Cuerpo.nuevo({ id: CUERPO_GENERAL, nombre: "Asamblea general", tipo: "GENERAL" }),
      Cuerpo.nuevo({ id: CUERPO_INGENIERIA, nombre: "Ingeniería", tipo: "FACULTAD" }),
      Cuerpo.nuevo({ id: CUERPO_MEDICINA, nombre: "Medicina", tipo: "FACULTAD" }),
      archivado,
    ]) {
      this.cuerpos.set(cuerpo.id, cuerpo);
    }
  }

  async porId(id: string): Promise<Cuerpo | null> {
    return this.cuerpos.get(id) ?? null;
  }

  async porSlug(slug: string): Promise<Cuerpo | null> {
    return [...this.cuerpos.values()].find((c) => c.slug === slug) ?? null;
  }

  async listar(): Promise<Cuerpo[]> {
    return [...this.cuerpos.values()];
  }

  async guardar(cuerpo: Cuerpo): Promise<void> {
    this.cuerpos.set(cuerpo.id, cuerpo);
  }
}
