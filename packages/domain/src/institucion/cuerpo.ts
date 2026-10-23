import { ErrorDeDominio } from "../errores.js";

export type TipoDeCuerpo = "GENERAL" | "FACULTAD";

const NOMBRE_MIN = 3;
const NOMBRE_MAX = 120;
const SLUG_MAX = 60;

export interface PropiedadesDeCuerpo {
  id: string;
  nombre: string;
  tipo: TipoDeCuerpo;
  slug: string;
  archivado: boolean;
}

/** "Facultad de Ingeniería" da "facultad-de-ingenieria". */
function slugDe(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, SLUG_MAX)
    .replace(/^-+|-+$/g, "");
}

function nombreValido(nombre: string): string {
  const limpio = nombre.trim();
  if (limpio.length < NOMBRE_MIN || limpio.length > NOMBRE_MAX || slugDe(limpio) === "") {
    throw new ErrorDeDominio("NOMBRE_DE_CUERPO_INVALIDO");
  }
  return limpio;
}

/** La asamblea general o una facultad (escuela, sede: el nombre del tipo lo pone la institución). */
export class Cuerpo {
  private _nombre: string;
  private _slug: string;
  private _archivado: boolean;

  private constructor(
    readonly id: string,
    nombre: string,
    readonly tipo: TipoDeCuerpo,
    slug: string,
    archivado: boolean,
  ) {
    this._nombre = nombre;
    this._slug = slug;
    this._archivado = archivado;
  }

  static nuevo(datos: { id: string; nombre: string; tipo: TipoDeCuerpo }): Cuerpo {
    const nombre = nombreValido(datos.nombre);
    return new Cuerpo(datos.id, nombre, datos.tipo, slugDe(nombre), false);
  }

  static reconstruir(props: PropiedadesDeCuerpo): Cuerpo {
    return new Cuerpo(props.id, props.nombre, props.tipo, props.slug, props.archivado);
  }

  get nombre(): string {
    return this._nombre;
  }

  get slug(): string {
    return this._slug;
  }

  get archivado(): boolean {
    return this._archivado;
  }

  renombrar(nombre: string): void {
    this._nombre = nombreValido(nombre);
    this._slug = slugDe(this._nombre);
  }

  archivar(): void {
    if (this.tipo === "GENERAL") throw new ErrorDeDominio("GENERAL_NO_SE_ARCHIVA");
    this._archivado = true;
  }
}
