import type { PropiedadesDeInstitucion } from "@kuorum/domain";
import type { RepositorioDeInstitucion } from "../puertos/repositorio-de-institucion.js";
import type { Actor } from "../sala/actor.js";
import { exigirAdministrador } from "./permisos.js";

export class ConfigurarInstitucion {
  constructor(private readonly institucion: RepositorioDeInstitucion) {}

  async ejecutar(actor: Actor, cambios: Partial<PropiedadesDeInstitucion>): Promise<void> {
    exigirAdministrador(actor);
    const institucion = await this.institucion.obtener();
    institucion.configurar(cambios);
    await this.institucion.guardar(institucion);
  }
}
