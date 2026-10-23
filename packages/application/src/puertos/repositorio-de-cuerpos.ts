import type { Cuerpo } from "@kuorum/domain";

export interface RepositorioDeCuerpos {
  porId(id: string): Promise<Cuerpo | null>;
  porSlug(slug: string): Promise<Cuerpo | null>;
  /** La general primero, luego por nombre. */
  listar(): Promise<Cuerpo[]>;
  guardar(cuerpo: Cuerpo): Promise<void>;
}
