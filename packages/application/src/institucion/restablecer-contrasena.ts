import { ErrorDeDominio } from "@kuorum/domain";
import type { CuentasDePersonal, GeneradorDeContrasenas } from "../puertos/cuentas-de-personal.js";
import type { DirectorioDePersonal } from "../puertos/directorio-de-personal.js";
import type { Actor } from "../sala/actor.js";
import { exigirAdministrador } from "./permisos.js";

/** Solo cuentas del personal: la del administrador y la de prueba se cambian por la terminal. */
export class RestablecerContrasena {
  constructor(
    private readonly cuentas: CuentasDePersonal,
    private readonly directorio: DirectorioDePersonal,
    private readonly contrasenas: GeneradorDeContrasenas,
  ) {}

  async ejecutar(actor: Actor, usuarioId: string): Promise<{ contrasena: string }> {
    exigirAdministrador(actor);
    if (!(await this.directorio.existe(usuarioId))) throw new ErrorDeDominio("NO_EXISTE");
    const contrasena = this.contrasenas.nueva();
    await this.cuentas.cambiarContrasena(usuarioId, contrasena);
    return { contrasena };
  }
}
