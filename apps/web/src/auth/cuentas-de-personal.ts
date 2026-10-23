import { randomBytes } from "node:crypto";
import type { CuentasDePersonal, GeneradorDeContrasenas } from "@kuorum/application";
import type { Autenticacion } from "./crear-auth";
import { cambiarContrasenaDeMesa, crearCuentaDeMesa } from "./crear-cuenta";

/** Las cuentas del personal se crean con Better Auth, igual que las de crear-admin. */
export class CuentasDePersonalConBetterAuth implements CuentasDePersonal {
  constructor(private readonly auth: () => Autenticacion) {}

  crear(correo: string, nombre: string, contrasena: string): Promise<string> {
    return crearCuentaDeMesa(this.auth(), { correo, nombre, contrasena, rol: "MESA" });
  }

  cambiarContrasena(usuarioId: string, contrasena: string): Promise<void> {
    return cambiarContrasenaDeMesa(this.auth(), usuarioId, contrasena);
  }
}

/** 18 bytes en base64url: 24 caracteres, como `crear-admin --generar`. */
export const generadorDeContrasenas: GeneradorDeContrasenas = {
  nueva: () => randomBytes(18).toString("base64url"),
};
