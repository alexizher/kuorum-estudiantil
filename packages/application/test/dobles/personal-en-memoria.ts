import type {
  CuentasDePersonal,
  DirectorioDePersonal,
  GeneradorDeContrasenas,
  Membresia,
  PersonaDelPersonal,
  RepositorioDeMembresias,
} from "../../src/index.js";

export class RepositorioDeMembresiasEnMemoria implements RepositorioDeMembresias {
  readonly membresias: Membresia[] = [];

  async deUsuario(usuarioId: string): Promise<Membresia[]> {
    return this.membresias.filter((m) => m.usuarioId === usuarioId);
  }

  async asignar(membresia: Membresia): Promise<void> {
    await this.quitar(membresia.usuarioId, membresia.cuerpoId);
    this.membresias.push(membresia);
  }

  async quitar(usuarioId: string, cuerpoId: string): Promise<void> {
    const indice = this.membresias.findIndex(
      (m) => m.usuarioId === usuarioId && m.cuerpoId === cuerpoId,
    );
    if (indice >= 0) this.membresias.splice(indice, 1);
  }
}

/** Cuentas y directorio en uno: el doble guarda lo que la web haría con Better Auth. */
export class PersonalEnMemoria implements CuentasDePersonal, DirectorioDePersonal {
  readonly cuentas = new Map<string, { nombre: string; correo: string; contrasena: string }>();

  constructor(private readonly membresias: RepositorioDeMembresiasEnMemoria) {}

  async crear(correo: string, nombre: string, contrasena: string): Promise<string> {
    const id = `u-${this.cuentas.size + 1}`;
    this.cuentas.set(id, { nombre, correo, contrasena });
    return id;
  }

  async cambiarContrasena(usuarioId: string, contrasena: string): Promise<void> {
    const cuenta = this.cuentas.get(usuarioId);
    if (cuenta === undefined) throw new Error("no existe");
    cuenta.contrasena = contrasena;
  }

  async listar(): Promise<PersonaDelPersonal[]> {
    return Promise.all(
      [...this.cuentas].map(async ([id, cuenta]) => ({
        id,
        nombre: cuenta.nombre,
        correo: cuenta.correo,
        membresias: await this.membresias.deUsuario(id),
      })),
    );
  }

  async existe(usuarioId: string): Promise<boolean> {
    return this.cuentas.has(usuarioId);
  }
}

export class GeneradorDeContrasenasGuionado implements GeneradorDeContrasenas {
  private siguiente = 0;

  nueva(): string {
    this.siguiente += 1;
    return `contrasena-generada-${this.siguiente}`;
  }
}
