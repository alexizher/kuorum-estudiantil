import type { RepositorioDeCuerpos } from "../puertos/repositorio-de-cuerpos.js";
import type { Actor } from "../sala/actor.js";
import { obtenerCuerpo } from "./obtener-cuerpo.js";
import { exigirAdministrador } from "./permisos.js";

/** Un cuerpo archivado no recibe sesiones nuevas; las que tiene siguen en el calendario. */
export class ArchivarCuerpo {
  constructor(private readonly cuerpos: RepositorioDeCuerpos) {}

  async ejecutar(actor: Actor, cuerpoId: string): Promise<void> {
    exigirAdministrador(actor);
    const cuerpo = await obtenerCuerpo(this.cuerpos, cuerpoId);
    cuerpo.archivar();
    await this.cuerpos.guardar(cuerpo);
  }
}
