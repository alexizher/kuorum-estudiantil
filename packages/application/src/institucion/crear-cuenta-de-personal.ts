import type { CuentasDePersonal, GeneradorDeContrasenas } from "../puertos/cuentas-de-personal.js";
import type { Actor } from "../sala/actor.js";
import { exigirAdministrador } from "./permisos.js";

/** La contraseña sale una sola vez, en la respuesta: el administrador se la entrega a la persona. */
export class CrearCuentaDePersonal {
  constructor(
    private readonly cuentas: CuentasDePersonal,
    private readonly contrasenas: GeneradorDeContrasenas,
  ) {}

  async ejecutar(
    actor: Actor,
    correo: string,
    nombre: string,
  ): Promise<{ usuarioId: string; contrasena: string }> {
    exigirAdministrador(actor);
    const contrasena = this.contrasenas.nueva();
    const usuarioId = await this.cuentas.crear(correo, nombre, contrasena);
    return { usuarioId, contrasena };
  }
}
