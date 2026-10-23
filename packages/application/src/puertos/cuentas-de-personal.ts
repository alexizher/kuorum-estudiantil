/** Alta y contraseña de cuentas MESA. La implementa la web con su librería de autenticación. */
export interface CuentasDePersonal {
  /** Devuelve el id de la cuenta creada. */
  crear(correo: string, nombre: string, contrasena: string): Promise<string>;
  /** Cambia la contraseña y cierra las sesiones abiertas de esa cuenta. */
  cambiarContrasena(usuarioId: string, contrasena: string): Promise<void>;
}

export interface GeneradorDeContrasenas {
  nueva(): string;
}
