import { pedirJson, type InstitucionDeMesa, type MetodoHttp } from "../mesa/cliente-de-mesa";

export type RolEnCuerpo = "ENCARGADO" | "MESA";

export interface CambiosDeInstitucion {
  nombre?: string;
  tipoDeCuerpoSingular?: string;
  tipoDeCuerpoPlural?: string;
  zonaHoraria?: string;
}

export interface PersonaDelPersonal {
  id: string;
  nombre: string;
  correo: string;
  membresias: { cuerpoId: string; rol: RolEnCuerpo }[];
}

/** Acciones del administrador de la instalación. Todas lanzan ErrorDeMesa si algo falla. */
export interface ClienteDeAdministracion {
  leerInstitucion(): Promise<InstitucionDeMesa>;
  configurar(cambios: CambiosDeInstitucion): Promise<void>;
  crearCuerpo(nombre: string): Promise<void>;
  renombrarCuerpo(id: string, nombre: string): Promise<void>;
  archivarCuerpo(id: string): Promise<void>;
  listarPersonal(): Promise<PersonaDelPersonal[]>;
  /** La contraseña solo existe en esta respuesta. */
  crearPersona(correo: string, nombre: string): Promise<{ usuarioId: string; contrasena: string }>;
  asignar(usuarioId: string, cuerpoId: string, rol: RolEnCuerpo): Promise<void>;
  quitar(usuarioId: string, cuerpoId: string): Promise<void>;
  restablecerContrasena(usuarioId: string): Promise<{ contrasena: string }>;
}

const MESA = "/api/mesa/v1";
const ruta = (texto: string) => encodeURIComponent(texto);

export class ClienteDeAdministracionPorFetch implements ClienteDeAdministracion {
  constructor(private readonly fetch: typeof globalThis.fetch) {}

  async leerInstitucion(): Promise<InstitucionDeMesa> {
    return (await this.pedir("GET", `${MESA}/institucion`)) as InstitucionDeMesa;
  }

  async configurar(cambios: CambiosDeInstitucion): Promise<void> {
    await this.pedir("PATCH", `${MESA}/institucion`, cambios);
  }

  async crearCuerpo(nombre: string): Promise<void> {
    await this.pedir("POST", `${MESA}/cuerpos`, { nombre });
  }

  async renombrarCuerpo(id: string, nombre: string): Promise<void> {
    await this.pedir("PATCH", `${MESA}/cuerpos/${ruta(id)}`, { nombre });
  }

  async archivarCuerpo(id: string): Promise<void> {
    await this.pedir("PATCH", `${MESA}/cuerpos/${ruta(id)}`, { archivado: true });
  }

  async listarPersonal(): Promise<PersonaDelPersonal[]> {
    const cuerpo = (await this.pedir("GET", `${MESA}/personal`)) as {
      personal: PersonaDelPersonal[];
    };
    return cuerpo.personal;
  }

  async crearPersona(
    correo: string,
    nombre: string,
  ): Promise<{ usuarioId: string; contrasena: string }> {
    return (await this.pedir("POST", `${MESA}/personal`, { correo, nombre })) as {
      usuarioId: string;
      contrasena: string;
    };
  }

  async asignar(usuarioId: string, cuerpoId: string, rol: RolEnCuerpo): Promise<void> {
    await this.pedir("PUT", `${MESA}/personal/${ruta(usuarioId)}/membresias`, { cuerpoId, rol });
  }

  async quitar(usuarioId: string, cuerpoId: string): Promise<void> {
    await this.pedir(
      "DELETE",
      `${MESA}/personal/${ruta(usuarioId)}/membresias?cuerpo=${ruta(cuerpoId)}`,
    );
  }

  async restablecerContrasena(usuarioId: string): Promise<{ contrasena: string }> {
    return (await this.pedir("POST", `${MESA}/personal/${ruta(usuarioId)}/contrasena`)) as {
      contrasena: string;
    };
  }

  private pedir(metodo: MetodoHttp, url: string, cuerpo?: unknown): Promise<unknown> {
    return pedirJson(this.fetch, metodo, url, cuerpo);
  }
}
