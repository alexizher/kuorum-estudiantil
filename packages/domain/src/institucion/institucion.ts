import { ErrorDeDominio } from "../errores.js";

export type ProveedorOAuth = "microsoft" | "google" | null;

export interface PropiedadesDeInstitucion {
  nombre: string;
  tipoDeCuerpoSingular: string;
  tipoDeCuerpoPlural: string;
  /** Zona IANA con la que se leen y muestran las horas de las sesiones. */
  zonaHoraria: string;
  /** URL del logo de la institución (opcional). */
  logoUrl: string | null;
  /** Color primario en hex (ej. #1b2242). */
  colorPrimario: string | null;
  /** Color secundario en hex (ej. #e2a11b). */
  colorSecundario: string | null;
  /** Texto de pie de página (opcional). */
  pieDePagina: string | null;
  /** Texto de bienvenida en la portada (opcional). */
  textoBienvenida: string | null;
  /** Proveedor OAuth para verificación institucional (opcional). */
  proveedorOAuth: ProveedorOAuth;
  /** Client ID del proveedor OAuth (opcional). */
  clientIdOAuth: string | null;
  /** Client Secret del proveedor OAuth (opcional). En producción debería ir encriptado. */
  clientSecretOAuth: string | null;
}

function texto(valor: string, minimo: number, maximo: number, codigo: string): string {
  const limpio = valor.trim();
  if (limpio.length < minimo || limpio.length > maximo) throw new ErrorDeDominio(codigo);
  return limpio;
}

function zonaValida(zona: string): string {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: zona });
  } catch {
    throw new ErrorDeDominio("ZONA_HORARIA_INVALIDA");
  }
  return zona;
}

function colorHexValido(color: string | null): string | null {
  if (color === null || color === undefined) return null;
  const limpio = color.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(limpio)) throw new ErrorDeDominio("COLOR_HEX_INVALIDO");
  return limpio;
}

function urlValida(url: string | null): string | null {
  if (url === null || url === undefined) return null;
  const limpio = url.trim();
  if (limpio === "") return null;
  if (!/^https?:\/\/.+/.test(limpio)) throw new ErrorDeDominio("LOGO_URL_INVALIDA");
  return limpio;
}

function textoOpcional(valor: string | null, maximo: number): string | null {
  if (valor === null || valor === undefined) return null;
  const limpio = valor.trim();
  if (limpio === "") return null;
  if (limpio.length > maximo) throw new ErrorDeDominio("TEXTO_LARGO_INVALIDO");
  return limpio;
}

function proveedorOAuthValido(proveedor: string | null): ProveedorOAuth {
  if (proveedor === null || proveedor === undefined) return null;
  const limpio = proveedor.trim().toLowerCase();
  if (limpio === "") return null;
  if (limpio !== "microsoft" && limpio !== "google")
    throw new ErrorDeDominio("PROVEEDOR_OAUTH_INVALIDO");
  return limpio;
}

function clientIdOAuthValido(clientId: string | null): string | null {
  if (clientId === null || clientId === undefined) return null;
  const limpio = clientId.trim();
  if (limpio === "") return null;
  if (limpio.length > 200) throw new ErrorDeDominio("CLIENT_ID_OAUTH_INVALIDO");
  return limpio;
}

function clientSecretOAuthValido(secret: string | null): string | null {
  if (secret === null || secret === undefined) return null;
  const limpio = secret.trim();
  if (limpio === "") return null;
  if (limpio.length > 500) throw new ErrorDeDominio("CLIENT_SECRET_OAUTH_INVALIDO");
  return limpio;
}

function validar(props: PropiedadesDeInstitucion): PropiedadesDeInstitucion {
  return {
    nombre: texto(props.nombre, 2, 120, "NOMBRE_DE_INSTITUCION_INVALIDO"),
    tipoDeCuerpoSingular: texto(props.tipoDeCuerpoSingular, 3, 40, "TIPO_DE_CUERPO_INVALIDO"),
    tipoDeCuerpoPlural: texto(props.tipoDeCuerpoPlural, 3, 40, "TIPO_DE_CUERPO_INVALIDO"),
    zonaHoraria: zonaValida(props.zonaHoraria),
    logoUrl: urlValida(props.logoUrl),
    colorPrimario: colorHexValido(props.colorPrimario),
    colorSecundario: colorHexValido(props.colorSecundario),
    pieDePagina: textoOpcional(props.pieDePagina, 500),
    textoBienvenida: textoOpcional(props.textoBienvenida, 1000),
    proveedorOAuth: proveedorOAuthValido(props.proveedorOAuth),
    clientIdOAuth: clientIdOAuthValido(props.clientIdOAuth),
    clientSecretOAuth: clientSecretOAuthValido(props.clientSecretOAuth),
  };
}

/** Una instalación sirve a una sola institución. */
export class Institucion {
  private constructor(private props: PropiedadesDeInstitucion) {}

  static reconstruir(props: PropiedadesDeInstitucion): Institucion {
    return new Institucion({ ...props });
  }

  get nombre(): string {
    return this.props.nombre;
  }

  get tipoDeCuerpoSingular(): string {
    return this.props.tipoDeCuerpoSingular;
  }

  get tipoDeCuerpoPlural(): string {
    return this.props.tipoDeCuerpoPlural;
  }

  get zonaHoraria(): string {
    return this.props.zonaHoraria;
  }

  get logoUrl(): string | null {
    return this.props.logoUrl;
  }

  get colorPrimario(): string | null {
    return this.props.colorPrimario;
  }

  get colorSecundario(): string | null {
    return this.props.colorSecundario;
  }

  get pieDePagina(): string | null {
    return this.props.pieDePagina;
  }

  get textoBienvenida(): string | null {
    return this.props.textoBienvenida;
  }

  get proveedorOAuth(): ProveedorOAuth {
    return this.props.proveedorOAuth;
  }

  get clientIdOAuth(): string | null {
    return this.props.clientIdOAuth;
  }

  get clientSecretOAuth(): string | null {
    return this.props.clientSecretOAuth;
  }

  configurar(cambios: Partial<PropiedadesDeInstitucion>): void {
    this.props = validar({ ...this.props, ...cambios });
  }
}
