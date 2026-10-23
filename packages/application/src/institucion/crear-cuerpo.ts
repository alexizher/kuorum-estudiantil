import { Cuerpo, type GeneradorDeIds } from "@kuorum/domain";
import type { RepositorioDeCuerpos } from "../puertos/repositorio-de-cuerpos.js";
import type { Actor } from "../sala/actor.js";
import { exigirSlugLibre } from "./obtener-cuerpo.js";
import { exigirAdministrador } from "./permisos.js";

/** Siempre una facultad: la general la crea la instalación y es una sola. */
export class CrearCuerpo {
  constructor(
    private readonly cuerpos: RepositorioDeCuerpos,
    private readonly ids: GeneradorDeIds,
  ) {}

  async ejecutar(actor: Actor, nombre: string): Promise<Cuerpo> {
    exigirAdministrador(actor);
    const cuerpo = Cuerpo.nuevo({ id: this.ids.nuevo(), nombre, tipo: "FACULTAD" });
    await exigirSlugLibre(this.cuerpos, cuerpo.slug);
    await this.cuerpos.guardar(cuerpo);
    return cuerpo;
  }
}
