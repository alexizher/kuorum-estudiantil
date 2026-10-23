import { filtroPublico, type ConsultaPublica } from "../decisiones/filtro-publico.js";
import type { RepositorioDeActas } from "../puertos/repositorio-de-actas.js";
import type { RepositorioDeCuerpos } from "../puertos/repositorio-de-cuerpos.js";
import type { ActaPublica } from "./obtener-acta-publica.js";

/** Público: actas finales fuera de la cuenta de prueba, por fecha de finalización. */
export class ListarActasPublicas {
  constructor(
    private readonly actas: RepositorioDeActas,
    private readonly cuerpos: RepositorioDeCuerpos,
  ) {}

  async ejecutar(consulta: ConsultaPublica): Promise<ActaPublica[]> {
    return this.actas.publicas(await filtroPublico(this.cuerpos, consulta));
  }
}
