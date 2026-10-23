import { ErrorDeDominio } from "../errores.js";

export interface PropiedadesDeInstitucion {
  nombre: string;
  tipoDeCuerpoSingular: string;
  tipoDeCuerpoPlural: string;
  /** Zona IANA con la que se leen y muestran las horas de las sesiones. */
  zonaHoraria: string;
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

function validar(props: PropiedadesDeInstitucion): PropiedadesDeInstitucion {
  return {
    nombre: texto(props.nombre, 2, 120, "NOMBRE_DE_INSTITUCION_INVALIDO"),
    tipoDeCuerpoSingular: texto(props.tipoDeCuerpoSingular, 3, 40, "TIPO_DE_CUERPO_INVALIDO"),
    tipoDeCuerpoPlural: texto(props.tipoDeCuerpoPlural, 3, 40, "TIPO_DE_CUERPO_INVALIDO"),
    zonaHoraria: zonaValida(props.zonaHoraria),
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

  configurar(cambios: Partial<PropiedadesDeInstitucion>): void {
    this.props = validar({ ...this.props, ...cambios });
  }
}
