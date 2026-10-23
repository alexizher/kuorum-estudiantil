import { ErrorDeDominio } from "@kuorum/domain";
import type { DirectorioDePersonal } from "../puertos/directorio-de-personal.js";
import type { RepositorioDeCuerpos } from "../puertos/repositorio-de-cuerpos.js";
import type { RepositorioDeMembresias } from "../puertos/repositorio-de-membresias.js";
import type { Actor, RolEnCuerpo } from "../sala/actor.js";
import { obtenerCuerpo } from "./obtener-cuerpo.js";
import { exigirAdministrador } from "./permisos.js";

export class AsignarMembresia {
  constructor(
    private readonly membresias: RepositorioDeMembresias,
    private readonly directorio: DirectorioDePersonal,
    private readonly cuerpos: RepositorioDeCuerpos,
  ) {}

  async ejecutar(
    actor: Actor,
    usuarioId: string,
    cuerpoId: string,
    rol: RolEnCuerpo,
  ): Promise<void> {
    exigirAdministrador(actor);
    if (!(await this.directorio.existe(usuarioId))) throw new ErrorDeDominio("NO_EXISTE");
    await obtenerCuerpo(this.cuerpos, cuerpoId);
    await this.membresias.asignar({ usuarioId, cuerpoId, rol });
  }
}
