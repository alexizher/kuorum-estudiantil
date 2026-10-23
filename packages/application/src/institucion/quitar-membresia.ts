import type { RepositorioDeMembresias } from "../puertos/repositorio-de-membresias.js";
import type { Actor } from "../sala/actor.js";
import { exigirAdministrador } from "./permisos.js";

export class QuitarMembresia {
  constructor(private readonly membresias: RepositorioDeMembresias) {}

  async ejecutar(actor: Actor, usuarioId: string, cuerpoId: string): Promise<void> {
    exigirAdministrador(actor);
    await this.membresias.quitar(usuarioId, cuerpoId);
  }
}
