import type {
  DirectorioDePersonal,
  PersonaDelPersonal,
} from "../puertos/directorio-de-personal.js";
import type { Actor } from "../sala/actor.js";
import { exigirAdministrador } from "./permisos.js";

export class ListarPersonal {
  constructor(private readonly directorio: DirectorioDePersonal) {}

  async ejecutar(actor: Actor): Promise<PersonaDelPersonal[]> {
    exigirAdministrador(actor);
    return this.directorio.listar();
  }
}
