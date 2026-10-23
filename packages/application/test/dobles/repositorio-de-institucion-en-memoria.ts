import { Institucion } from "@kuorum/domain";
import type { RepositorioDeInstitucion } from "../../src/puertos/repositorio-de-institucion.js";

export class RepositorioDeInstitucionEnMemoria implements RepositorioDeInstitucion {
  institucion = Institucion.reconstruir({
    nombre: "Universidad de Ejemplo",
    tipoDeCuerpoSingular: "Facultad",
    tipoDeCuerpoPlural: "Facultades",
    zonaHoraria: "America/Bogota",
    logoUrl: null,
    colorPrimario: null,
    colorSecundario: null,
    pieDePagina: null,
    textoBienvenida: null,
    proveedorOAuth: null,
    clientIdOAuth: null,
    clientSecretOAuth: null,
  });

  async obtener(): Promise<Institucion> {
    return this.institucion;
  }

  async guardar(institucion: Institucion): Promise<void> {
    this.institucion = institucion;
  }
}
